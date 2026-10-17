import base64

import pytest

from memecoin_bot.base58 import b58decode, b58encode
from memecoin_bot.events import (IDL_FILE, IDL_SHA256, PUMP_PROGRAM_ID, DecodeError, EventDecoder, EventEncoder,
                                 default_decoder, idl_sha256, is_sol_quote, pubkey_str)

MINT = "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr"
USER = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
WSOL = "So11111111111111111111111111111111111111112"
DEFAULT_PUBKEY = "11111111111111111111111111111111"


def trade_values(**overrides):
    values = {
        "mint": MINT, "sol_amount": 1_500_000_000, "token_amount": 52_000_000_000_000, "is_buy": True,
        "user": USER, "timestamp": 1_792_234_460, "virtual_sol_reserves": 31_500_000_000,
        "virtual_token_reserves": 1_021_000_000_000_000, "real_sol_reserves": 1_500_000_000,
        "real_token_reserves": 741_100_000_000_000, "fee_basis_points": 95, "fee": 14_250_000,
        "creator": USER, "creator_fee_basis_points": 30, "creator_fee": 4_500_000, "ix_name": "buy_v3",
        "mayhem_mode": False, "shareholders": [{"address": USER, "share_bps": 10000}],
        "quote_mint": DEFAULT_PUBKEY, "quote_amount": 1_500_000_000,
    }
    values.update(overrides)
    return values


@pytest.fixture(scope="module")
def codec():
    dec = default_decoder()
    return dec, EventEncoder(dec)


def test_vendored_idl_matches_recorded_hash():
    assert idl_sha256() == IDL_SHA256
    assert default_decoder().address == PUMP_PROGRAM_ID
    assert IDL_FILE.exists()


def test_idl_still_has_fields_the_engine_needs():
    dec = default_decoder()
    assert {"mint", "sol_amount", "token_amount", "is_buy", "user", "timestamp", "virtual_sol_reserves",
            "virtual_token_reserves", "real_token_reserves", "creator", "ix_name", "mayhem_mode",
            "quote_mint", "fee_basis_points", "creator_fee_basis_points"} <= set(dec.field_names("TradeEvent"))
    assert {"name", "symbol", "uri", "mint", "bonding_curve", "user", "creator", "timestamp",
            "virtual_token_reserves", "virtual_sol_reserves", "real_token_reserves", "token_total_supply",
            "is_mayhem_mode", "quote_mint", "depth"} <= set(dec.field_names("CreateEvent"))
    assert {"mint", "bonding_curve", "timestamp"} <= set(dec.field_names("CompleteEvent"))
    assert {"mint", "pool_base_reserves_after", "pool_quote_reserves_after"} <= set(
        dec.field_names("PostCompleteBuyEvent"))


def test_discriminator_matches_known_log_prefix(codec):
    dec, enc = codec
    # Public pump.fun log parsers match "Program data: vdt/..." for TradeEvent.
    data = enc.encode("TradeEvent", trade_values())
    assert base64.b64encode(data).decode().startswith("vdt/")


def test_trade_round_trip(codec):
    dec, enc = codec
    ev = dec.decode(enc.encode("TradeEvent", trade_values()))
    assert ev.name == "TradeEvent" and ev.complete and ev.extra_bytes == 0
    assert pubkey_str(ev["mint"]) == MINT and pubkey_str(ev["user"]) == USER
    assert ev["is_buy"] is True and ev["sol_amount"] == 1_500_000_000
    assert ev["ix_name"] == "buy_v3"
    assert ev["shareholders"] == [{"address": b58decode(USER), "share_bps": 10000}]
    assert is_sol_quote(ev["quote_mint"])


def test_create_round_trip_with_unicode(codec):
    dec, enc = codec
    values = {"name": "Mönd Frög 🐸", "symbol": "MFROG", "uri": "https://ipfs.io/ipfs/x", "mint": MINT,
              "bonding_curve": USER, "user": USER, "creator": USER, "timestamp": 1, "token_total_supply": 10**15,
              "is_mayhem_mode": True, "quote_mint": WSOL, "depth": 0}
    ev = dec.decode(enc.encode("CreateEvent", values))
    assert ev.name == "CreateEvent" and ev["name"] == "Mönd Frög 🐸" and ev["is_mayhem_mode"] is True
    assert is_sol_quote(ev["quote_mint"])


def test_older_shorter_event_keeps_prefix(codec):
    dec, enc = codec
    total = len(dec.field_names("TradeEvent"))
    for drop in range(1, total - 9):
        ev = dec.decode(enc.encode("TradeEvent", trade_values(), drop_last=drop))
        assert not ev.complete
        assert len(ev.missing) == drop
        assert ev["mint"] is not None and ev["virtual_token_reserves"] == 1_021_000_000_000_000
        assert all(ev.fields[f] is None for f in ev.missing)


def test_truncation_at_every_byte_never_crashes(codec):
    dec, enc = codec
    data = enc.encode("TradeEvent", trade_values())
    for cut in range(8, len(data)):
        ev = dec.decode(data[:cut])
        assert ev is not None and not ev.complete


def test_extra_trailing_bytes_are_counted(codec):
    dec, enc = codec
    ev = dec.decode(enc.encode("CompleteEvent", {"mint": MINT}) + b"\x00" * 9)
    assert ev.complete and ev.extra_bytes == 9


def test_misaligned_data_raises(codec):
    dec, enc = codec
    data = bytearray(enc.encode("TradeEvent", trade_values()))
    data[8 + 32 + 16] = 7  # is_buy byte must be 0 or 1
    with pytest.raises(DecodeError):
        dec.decode(bytes(data))


def test_unknown_discriminator_returns_none(codec):
    dec, _ = codec
    assert dec.decode(b"\x01" * 40) is None


def test_base58_round_trip_and_sol_quote():
    for text in (MINT, USER, WSOL, DEFAULT_PUBKEY):
        raw = b58decode(text)
        assert len(raw) == 32 and b58encode(raw) == text
    assert b58decode(DEFAULT_PUBKEY) == bytes(32)
    assert is_sol_quote(DEFAULT_PUBKEY) and is_sol_quote(WSOL) and is_sol_quote(None)
    assert not is_sol_quote("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
    with pytest.raises(ValueError):
        b58decode("0OIl")


def test_decoder_handles_options_arrays_and_enums():
    idl = {"address": "x", "events": [{"name": "E", "discriminator": [1, 2, 3, 4, 5, 6, 7, 8]}],
           "types": [
               {"name": "E", "type": {"kind": "struct", "fields": [
                   {"name": "o", "type": {"option": "u16"}},
                   {"name": "a", "type": {"array": ["u8", 3]}},
                   {"name": "k", "type": {"defined": {"name": "Kind"}}},
               ]}},
               {"name": "Kind", "type": {"kind": "enum", "variants": [{"name": "A"}, {"name": "B"}]}},
           ]}
    dec = EventDecoder(idl)
    ev = dec.decode(bytes([1, 2, 3, 4, 5, 6, 7, 8]) + b"\x01\x05\x00" + b"\x01\x02\x03" + b"\x01")
    assert ev.fields == {"o": 5, "a": [1, 2, 3], "k": "B"}
    with pytest.raises(DecodeError):
        dec.decode(bytes([1, 2, 3, 4, 5, 6, 7, 8]) + b"\x02")
