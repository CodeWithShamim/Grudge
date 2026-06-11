#!/usr/bin/env python3
"""Custom GenVM static checks for GenLayer Intelligent Contracts.

Fails CI (exit 1) on:
  1. missing/invalid `# { "Depends": "py-genlayer:..." }` header
  2. != 1 gl.Contract subclass
  3. unannotated or non-storable contract state types
  4. public-looking methods missing @gl.public.view/@gl.public.write
  5. state mutation inside @gl.public.view methods
  6. gl.exec_prompt / gl.get_webpage outside a zero-arg fn passed to gl.eq_principle_*
  7. storage (self.*) access inside non-deterministic blocks
  8. banned imports (os, requests, random, time, ...)
  9. LLM JSON not serialized with json.dumps(..., sort_keys=True)
"""

from __future__ import annotations

import ast
import json
import re
import sys
from pathlib import Path

BANNED_IMPORTS = {"os", "requests", "random", "time", "socket", "subprocess", "urllib"}
STORABLE_BASES = {
    "u8",
    "u16",
    "u32",
    "u64",
    "u128",
    "u256",
    "i8",
    "i16",
    "i32",
    "i64",
    "str",
    "bool",
    "bytes",
    "Address",
    "DynArray",
    "TreeMap",
}
# official API (gl.nondet.*) plus legacy spellings, all dotted from `gl.`
NONDET_CALLS = {
    "gl.nondet.exec_prompt",
    "gl.nondet.web.get",
    "gl.nondet.web.render",
    "gl.exec_prompt",  # legacy
    "gl.get_webpage",  # legacy
}
EQ_PRINCIPLE_PREFIX = "eq_principle"


class Linter(ast.NodeVisitor):
    def __init__(self, source: str, filename: str) -> None:
        self.source = source
        self.filename = filename
        self.errors: list[str] = []
        self.contract_classes: list[ast.ClassDef] = []
        # names of zero-arg closures passed to gl.eq_principle_*
        self.nondet_fn_names: set[str] = set()

    def err(self, node: ast.AST | None, message: str) -> None:
        line = getattr(node, "lineno", 0)
        self.errors.append(f"{self.filename}:{line}: {message}")

    # ── rule 1: depends header ────────────────────────────────────────────
    def check_header(self) -> None:
        first_line = self.source.splitlines()[0] if self.source else ""
        match = re.match(r"#\s*(\{.*\})\s*$", first_line)
        if not match:
            self.errors.append(f'{self.filename}:1: missing `# {{ "Depends": ... }}` header')
            return
        try:
            header = json.loads(match.group(1))
        except json.JSONDecodeError:
            self.errors.append(f"{self.filename}:1: Depends header is not valid JSON")
            return
        depends = header.get("Depends", "")
        if not isinstance(depends, str) or not depends.startswith("py-genlayer:"):
            self.errors.append(f"{self.filename}:1: Depends must be 'py-genlayer:<version>'")

    # ── rule 8: banned imports ────────────────────────────────────────────
    def visit_Import(self, node: ast.Import) -> None:
        for alias in node.names:
            root = alias.name.split(".")[0]
            if root in BANNED_IMPORTS:
                self.err(node, f"banned import '{alias.name}' (non-deterministic in GenVM)")
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        root = (node.module or "").split(".")[0]
        if root in BANNED_IMPORTS:
            self.err(node, f"banned import 'from {node.module}' (non-deterministic in GenVM)")
        self.generic_visit(node)

    # ── classes ───────────────────────────────────────────────────────────
    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        if any(self._dotted(b) == "gl.Contract" for b in node.bases):
            self.contract_classes.append(node)
            self._check_contract(node)
        self.generic_visit(node)

    @staticmethod
    def _dotted(node: ast.AST) -> str:
        parts: list[str] = []
        while isinstance(node, ast.Attribute):
            parts.append(node.attr)
            node = node.value
        if isinstance(node, ast.Name):
            parts.append(node.id)
        return ".".join(reversed(parts))

    def _decorators(self, fn: ast.FunctionDef) -> list[str]:
        return [self._dotted(d) for d in fn.decorator_list]

    # ── rules 3,4,5 within the contract class ─────────────────────────────
    def _check_contract(self, cls: ast.ClassDef) -> None:
        for stmt in cls.body:
            # state declarations
            if isinstance(stmt, ast.Assign):
                self.err(stmt, "contract state must be type-annotated (use `name: Type`)")
            if isinstance(stmt, ast.AnnAssign) and isinstance(stmt.target, ast.Name):
                base = stmt.annotation
                root = ""
                if isinstance(base, ast.Subscript):
                    root = self._dotted(base.value)
                else:
                    root = self._dotted(base)
                if (
                    root.split(".")[-1] not in STORABLE_BASES
                    and root not in self._storage_classes()
                ):
                    self.err(stmt, f"state '{stmt.target.id}' has non-storable type '{root}'")

            if isinstance(stmt, ast.FunctionDef):
                decorators = self._decorators(stmt)
                is_public = any(d.startswith("gl.public") for d in decorators)
                if not is_public and not stmt.name.startswith("_") and stmt.name != "__init__":
                    self.err(
                        stmt,
                        f"method '{stmt.name}' looks public but lacks @gl.public.view/@gl.public.write",
                    )
                if "gl.public.view" in decorators:
                    self._check_view_mutation(stmt)

    def _storage_classes(self) -> set[str]:
        tree = ast.parse(self.source)
        out: set[str] = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                for dec in node.decorator_list:
                    if self._dotted(dec) == "allow_storage":
                        out.add(node.name)
        return out

    def _check_view_mutation(self, fn: ast.FunctionDef) -> None:
        for node in ast.walk(fn):
            targets: list[ast.expr] = []
            if isinstance(node, ast.Assign):
                targets = list(node.targets)
            elif isinstance(node, (ast.AugAssign, ast.AnnAssign)):
                targets = [node.target]
            for t in targets:
                dotted = self._dotted(t) if isinstance(t, (ast.Attribute, ast.Name)) else ""
                if isinstance(t, ast.Subscript):
                    dotted = self._dotted(t.value)
                if dotted.startswith("self."):
                    self.err(node, f"view '{fn.name}' mutates state '{dotted}'")
            if isinstance(node, ast.Call):
                callee = self._dotted(node.func)
                if callee.startswith("self.") and any(
                    callee.endswith(m) for m in (".append", ".pop", ".clear", ".extend")
                ):
                    self.err(node, f"view '{fn.name}' mutates state via '{callee}'")

    # ── rules 6,7: non-deterministic blocks ───────────────────────────────
    def collect_nondet_fns(self, tree: ast.Module) -> None:
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                callee = self._dotted(node.func)
                if (
                    callee.startswith(f"gl.{EQ_PRINCIPLE_PREFIX}")
                    and node.args
                    and isinstance(node.args[0], ast.Name)
                ):
                    self.nondet_fn_names.add(node.args[0].id)

    def check_nondet_rules(self, tree: ast.Module) -> None:
        # map function name -> def node (incl. nested)
        fn_defs: dict[str, ast.FunctionDef] = {}
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                fn_defs[node.name] = node

        # line ranges covered by non-deterministic closures
        nondet_ranges = [
            (fn.lineno, fn.end_lineno or fn.lineno)
            for name, fn in fn_defs.items()
            if name in self.nondet_fn_names
        ]

        def in_nondet(node: ast.AST) -> bool:
            line = getattr(node, "lineno", 0)
            return any(start <= line <= end for start, end in nondet_ranges)

        for name, fn in fn_defs.items():
            if name in self.nondet_fn_names:
                args = fn.args
                if args.args or args.posonlyargs or args.kwonlyargs or args.vararg or args.kwarg:
                    self.err(fn, f"non-deterministic fn '{name}' must take zero args")
                for node in ast.walk(fn):
                    if isinstance(node, ast.Attribute) and self._dotted(node).startswith("self."):
                        self.err(
                            node,
                            f"storage access '{self._dotted(node)}' inside non-deterministic fn '{name}'",
                        )

        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                callee = self._dotted(node.func)
                if callee in NONDET_CALLS and not in_nondet(node):
                    self.err(node, f"'{callee}' called outside a gl.eq_principle.* closure")

    # ── rule 9: sorted JSON for LLM outputs ───────────────────────────────
    def check_json_dumps(self, tree: ast.Module) -> None:
        for node in ast.walk(tree):
            if isinstance(node, ast.Call) and self._dotted(node.func) == "json.dumps":
                has_sort = any(
                    kw.arg == "sort_keys"
                    and isinstance(kw.value, ast.Constant)
                    and kw.value.value is True
                    for kw in node.keywords
                )
                if not has_sort:
                    self.err(
                        node, "json.dumps(...) must use sort_keys=True for consensus determinism"
                    )


def lint_file(path: Path) -> list[str]:
    source = path.read_text()
    linter = Linter(source, str(path))
    linter.check_header()
    tree = ast.parse(source)
    linter.collect_nondet_fns(tree)
    linter.visit(tree)
    linter.check_nondet_rules(tree)
    linter.check_json_dumps(tree)
    if len(linter.contract_classes) != 1:
        linter.errors.append(
            f"{path}: expected exactly 1 gl.Contract subclass, found {len(linter.contract_classes)}"
        )
    return linter.errors


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: genvm_lint.py <contract.py> [...]", file=sys.stderr)
        return 2
    all_errors: list[str] = []
    for arg in sys.argv[1:]:
        all_errors.extend(lint_file(Path(arg)))
    for error in all_errors:
        print(error, file=sys.stderr)
    if all_errors:
        print(f"\ngenvm_lint: {len(all_errors)} error(s)", file=sys.stderr)
        return 1
    print("genvm_lint: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
