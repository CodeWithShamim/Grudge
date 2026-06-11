# GRUDGE contract toolchain.
#
# Prereqs:
#   pip install ruff mypy pytest gltest   (or: make setup)
#   npm i -g genlayer                     (GenLayer CLI, for deploy)

PY ?= python3
CONTRACT = grudge.py

.PHONY: setup lint format test test-math test-bradbury deploy clean

setup:
	$(PY) -m pip install --quiet ruff mypy pytest gltest

lint:
	ruff check . --config pyproject.toml
	ruff format --check .
	MYPYPATH=stubs mypy $(CONTRACT) --strict --config-file pyproject.toml
	$(PY) scripts/genvm_lint.py $(CONTRACT)

format:
	ruff format .

# CI default: settlement-math unit tests (no network) + gltest vs studionet.
test: test-math
	gltest --network studionet

test-math:
	$(PY) -m pytest tests/test_settle_math.py -q

# Pre-release verification target — Bradbury history resets periodically,
# so this is NOT the CI default.
test-bradbury:
	gltest --network testnet-bradbury

# Deploys to Bradbury and writes the address into the web app env + a record.
deploy:
	genlayer network testnet-bradbury
	genlayer deploy --contract $(CONTRACT) | tee .deploy.log
	$(PY) scripts/record_deploy.py .deploy.log

clean:
	rm -rf .ruff_cache .mypy_cache .pytest_cache __pycache__ .deploy.log
