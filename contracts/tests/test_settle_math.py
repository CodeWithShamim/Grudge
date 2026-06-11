"""Pure-python unit tests for the settlement math in grudge.py.

The functions below MIRROR Grudge.settle()'s integer arithmetic exactly
(floor division, dust-to-rake). Studionet has no time travel, so the
deadline-gated path is verified here at the math level and on Bradbury
manually with a short-duration challenge.
"""

RAKE_BPS = 200


def settle_payouts(
    self_stake: int, believer_stakes: list[int], doubter_stakes: list[int], succeeded: bool
):
    """Mirror of Grudge.settle() payout arithmetic."""
    believer_total = sum(believer_stakes) + self_stake
    doubter_total = sum(doubter_stakes)
    losing_pool = doubter_total if succeeded else believer_total
    rake = losing_pool * RAKE_BPS // 10_000
    distributable = losing_pool - rake

    payouts = []
    paid = 0
    if succeeded and believer_total > 0:
        share = distributable * self_stake // believer_total
        payouts.append(self_stake + share)
        paid += share
        for amount in believer_stakes:
            share = distributable * amount // believer_total
            payouts.append(amount + share)
            paid += share
    elif not succeeded and doubter_total > 0:
        for amount in doubter_stakes:
            share = distributable * amount // doubter_total
            payouts.append(amount + share)
            paid += share
    dust = distributable - paid
    return payouts, rake, dust


def test_success_pays_believers_exactly_pool_minus_rake():
    payouts, rake, dust = settle_payouts(
        self_stake=200, believer_stakes=[60, 40], doubter_stakes=[150, 80, 120], succeeded=True
    )
    losing = 350
    assert rake == losing * RAKE_BPS // 10_000
    # winners receive their stakes back plus exactly the distributable pool (minus dust)
    assert sum(payouts) + dust == 200 + 60 + 40 + (losing - rake)
    assert dust < len(payouts)  # dust strictly bounded by floor-division losses


def test_failure_pays_doubters_pro_rata():
    payouts, rake, dust = settle_payouts(
        self_stake=100, believer_stakes=[50], doubter_stakes=[300, 100], succeeded=False
    )
    losing = 150
    assert rake == 3  # 2% of 150
    assert sum(payouts) + dust == 300 + 100 + (losing - rake)
    # pro-rata: the 300-staker gets 3x the 100-staker's share of the pool
    win_300 = payouts[0] - 300
    win_100 = payouts[1] - 100
    assert abs(win_300 - 3 * win_100) <= 3  # integer dust tolerance


def test_no_winners_edge_case():
    payouts, rake, dust = settle_payouts(
        self_stake=100, believer_stakes=[], doubter_stakes=[], succeeded=False
    )
    assert payouts == []
    assert rake == 2
    assert dust == 98  # nobody to pay; everything lands in the vault


def test_conservation_holds_for_awkward_amounts():
    for succeeded in (True, False):
        payouts, rake, dust = settle_payouts(
            self_stake=7,
            believer_stakes=[3, 11, 1],
            doubter_stakes=[13, 5, 17],
            succeeded=succeeded,
        )
        losing = 35 if succeeded else 22
        winners_stakes = (7 + 3 + 11 + 1) if succeeded else (13 + 5 + 17)
        assert sum(payouts) + dust + rake == winners_stakes + losing
