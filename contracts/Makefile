# GRUDGE contract toolchain.
#
# Prereqs:
#   pip install ruff mypy pytest gltest   (or: make setup)
#   npm i -g genlayer                     (GenLayer CLI, for deploy)

# Use the local virtualenv's tools when it exists (so `make` works without
# manually activating .venv), otherwise fall back to whatever is on PATH.
# The venv bin is also prepended to PATH so tools that shell out to siblings
# (genvm-lint → pyright) find them too.
VENV_BIN := $(if $(wildcard .venv/bin),$(abspath .venv/bin)/,)
ifneq ($(VENV_BIN),)
export PATH := $(abspath .venv/bin):$(PATH)
endif
PY ?= $(if $(VENV_BIN),$(VENV_BIN)python,python3)
RUFF := $(VENV_BIN)ruff
MYPY := $(VENV_BIN)mypy
PYTEST := $(VENV_BIN)pytest
GENVM_LINT := $(VENV_BIN)genvm-lint
CONTRACT = grudge.py

# gltest is part of the GenLayer toolchain (not on PyPI). Use the venv copy if
# present, otherwise whatever is on PATH.
GLTEST := $(if $(wildcard .venv/bin/gltest),$(VENV_BIN)gltest,gltest)

.PHONY: setup lint check typecheck format test test-math test-chain test-bradbury deploy clean

setup:
	$(PY) -m pip install --quiet ruff mypy pytest genlayer-test genvm-linter pyright

lint:
	$(RUFF) check . --config pyproject.toml
	$(RUFF) format --check .
	MYPYPATH=stubs $(MYPY) $(CONTRACT) --strict --config-file pyproject.toml
	$(PY) scripts/genvm_lint.py $(CONTRACT)
	$(GENVM_LINT) check $(CONTRACT) --json
	$(GENVM_LINT) typecheck $(CONTRACT) --json

# GenVM rule lint + contract validation (Depends header, one gl.Contract,
# storable state, public-method ABI, etc.)
check:
	$(GENVM_LINT) check $(CONTRACT) --json

# GenVM static typecheck of the contract.
typecheck:
	$(GENVM_LINT) typecheck $(CONTRACT) --json

format:
	$(RUFF) format .

# CI default: fast Direct Mode tests that run the REAL contract in-memory
# (no Docker, no network, LLM mocked) per the official GenLayer docs, plus the
# pure settlement-math units. Milliseconds, runs everywhere.
test: test-unit

test-unit:
	$(PY) -m pytest tests/test_grudge_direct.py tests/test_settle_math.py -q

# Back-compat alias.
test-math: test-unit

# Studio-mode integration suite (multi-validator consensus over RPC). Point
# NETWORK at a localnet simulator (default) or studionet. Needs gltest
# installed AND a running simulator — run `make setup`.
NETWORK ?= localnet
test-chain:
	@command -v $(GLTEST) >/dev/null 2>&1 || { \
	  echo "✘ gltest not installed. Run: make setup"; exit 1; }
	$(GLTEST) tests/test_grudge.py --network $(NETWORK)

# Pre-release verification target — Bradbury history resets periodically,
# so this is NOT the CI default.
test-bradbury:
	$(GLTEST) --network testnet_bradbury

# Deploys to Bradbury and writes the address into the web app env + a record.
deploy:
	genlayer network testnet_bradbury
	genlayer deploy --contract $(CONTRACT) | tee .deploy.log
	$(PY) scripts/record_deploy.py .deploy.log

clean:
	rm -rf .ruff_cache .mypy_cache .pytest_cache __pycache__ .deploy.log
