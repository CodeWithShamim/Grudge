# Stub for the `gl` namespace of the GenVM Python SDK (subset used by grudge.py).
# Mirrors the official API at https://docs.genlayer.com (transaction-context,
# equivalence-principle, value-transfers, types/dataclasses).
import typing

from genlayer import Address

_T = typing.TypeVar("_T")

class Contract: ...

class _Message:
    sender_address: Address
    origin_address: Address
    contract_address: Address
    value: int
    chain_id: int

message: _Message
message_raw: dict[str, typing.Any]

class _PublicView:
    def __call__(self, fn: _T) -> _T: ...

class _PublicWrite:
    payable: _PublicView
    def __call__(self, fn: _T) -> _T: ...

class _Public:
    view: _PublicView
    write: _PublicWrite

public: _Public

class vm:
    class UserError(Exception):
        def __init__(self, message: str) -> None: ...

class nondet:
    class _WebResponse:
        body: typing.Any

    class web:
        @staticmethod
        def get(url: str) -> nondet._WebResponse: ...
        @staticmethod
        def render(url: str, *, mode: str = ...) -> str: ...

    @staticmethod
    def exec_prompt(prompt: str) -> str: ...

class eq_principle:
    @staticmethod
    def prompt_comparative(fn: typing.Callable[[], str], principle: str) -> str: ...
    @staticmethod
    def prompt_non_comparative(fn: typing.Callable[[], str], task: str, criteria: str) -> str: ...
    @staticmethod
    def strict_eq(fn: typing.Callable[[], str]) -> str: ...

class storage:
    @staticmethod
    def inmem_allocate(t: type[_T], *args: typing.Any, **kwargs: typing.Any) -> _T: ...

class evm:
    # returns a callable proxy factory so decorated ghost interfaces type as Any
    @staticmethod
    def contract_interface(contract_cls: type) -> typing.Callable[..., typing.Any]: ...

def get_contract_at(address: Address) -> typing.Any: ...
