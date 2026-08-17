#!/usr/bin/env python3
"""
Przypisuje countersNeeded do mastermindów w cards.json
na podstawie tekstów ich kart (Master Strike + Taktyki).
"""

import json
import re
from pathlib import Path

CARDS_JSON_PATH = Path(__file__).parent.parent / "src/assets/cards.json"


def derive_mastermind_counters(cards: list[dict]) -> list[str]:
    all_text = "\n".join(c.get("abilities", "") for c in cards)
    counters: set[str] = set()

    # ── WOUND EFFECTS ────────────────────────────────────────────────────────
    # Any "gains a Wound" threat (Strike, Command Strike, Tactic)
    if re.search(r"(Master Strike|Command Strike|Fight):.*gain(s)? (a |two )?Wound", all_text, re.I):
        counters.add("wound-removal")
    if re.search(r"or gain(s)? (a |two )?Wound", all_text, re.I):
        counters.add("wound-removal")
    # [Finish the Prey] gains two Wounds
    if re.search(r"\[Finish the Prey\]|gains two Wounds", all_text, re.I):
        counters.add("wound-removal")
    # Puts Wounds from discard on top of deck
    if re.search(r"puts? (a |two )?Wound(s)? from.*discard.*(on top|onto)", all_text, re.I):
        counters.add("wound-removal")
    # "discards N cards equal to number of Wounds"
    if re.search(r"discards? (that many|.*number of Wounds)", all_text, re.I):
        counters.add("wound-removal")
        counters.add("extra-draws")

    # ── DISCARD EFFECTS ──────────────────────────────────────────────────────
    # Standard discard in Strike/Command Strike
    if re.search(r"(Master Strike|Command Strike):.*discard(s)?", all_text, re.I):
        counters.add("extra-draws")
    # "discard down to N cards"
    if re.search(r"discard(s)? down to (four|five|six|\d) cards?", all_text, re.I):
        counters.add("extra-draws")
    # "discards their hand"
    if re.search(r"discard(s)? (all|their|their entire) (hand|cards?)", all_text, re.I):
        counters.add("extra-draws")
    # Demonic Bargain to discard
    if re.search(r"\[Demonic Bargain\].*discard|discard.*\[Demonic Bargain\]", all_text, re.I):
        counters.add("extra-draws")
    # Discard half of cards (Thanos: The Snap)
    if re.search(r"discard(s)? half", all_text, re.I):
        counters.add("extra-draws")
        counters.add("recruit-boost")
    # Discard Tactic: targets specific class
    if re.search(r"(discard(s)?|KO(s)?) (a |an |one )?\[(Covert|Strength|Instinct|Ranged|Tech|X-Men|Marvel Knights|SHIELD|Avengers)\]", all_text, re.I):
        counters.add("multi-class")

    # ── DECK-THINNING (KO) ───────────────────────────────────────────────────
    # Strike: KO Heroes/cards
    if re.search(r"(Master Strike|Command Strike):.*KO(s|'?s)?", all_text, re.I):
        counters.add("deck-thinning")
    # Tactics: KO Heroes from discard/hand
    if re.search(r"Fight:.*KO(s)? (a |one |two |up to two )?(non-grey )?Hero(es)?", all_text, re.I):
        counters.add("deck-thinning")
    # Puts Heroes into a side pile (Threat Analysis, Bound Souls, Telepathic Pawns)
    if re.search(r"puts? (a |one )?.*Hero(es)?.*(Threat Analysis|Bound Souls|Telepathic Pawn|next to (Ultron|Thanos|Professor X))", all_text, re.I):
        counters.add("deck-thinning")
    # KO cards costing 1-2
    if re.search(r"KO(s)? (a |one )?cards? that cost(s)? [12]", all_text, re.I):
        counters.add("deck-thinning")
    # Demonic Bargain to KO
    if re.search(r"\[Demonic Bargain\].*KO", all_text, re.I):
        counters.add("deck-thinning")
    # Discard entire deck
    if re.search(r"discards? (their|your) deck|discard(s)? (their|your) entire", all_text, re.I):
        counters.add("extra-draws")
        counters.add("deck-thinning")
        counters.add("recruit-boost")

    # ── VILLAIN MECHANICS ────────────────────────────────────────────────────
    # Boosted by Villains in city
    if re.search(r"gets \+\d+\[Attack\] for each (other )?Villain", all_text, re.I):
        counters.add("villain-control")
        counters.add("heavy-hitter")
    # Boosted by Villains in Escape Pile / city (Thanos: Infinity Stones)
    if re.search(r"gets \+\d+\[Attack\] for each.*(city|Escape Pile)", all_text, re.I):
        counters.add("heavy-hitter")
        counters.add("villain-control")
    # Tactics re-enter Villains into city
    if re.search(r"Fight:.*enters? (the city|a city space)", all_text, re.I):
        counters.add("villain-control")
    # Villains escaping / destroying city spaces
    if re.search(r"Villain(s)? (there )?escape(s)?|Destroy (the )?city space", all_text, re.I):
        counters.add("villain-control")
        counters.add("heavy-hitter")
    # Odin-style: boosted by Asgardians/Villains in overrun pile
    if re.search(r"for each.*(in the city|in the Overrun Pile)", all_text, re.I):
        counters.add("villain-control")
        counters.add("heavy-hitter")

    # ── MULTI-CLASS REQUIREMENTS ─────────────────────────────────────────────
    # "Cosmic Threat" requires all 5 classes
    if re.search(r"\[Cosmic Threat\]", all_text, re.I):
        counters.add("multi-class")
        counters.add("heavy-hitter")
    # "reveals a [X-Men/etc.] or [negative effect]" — need that faction
    if re.search(r"reveals? (a |an |one )?\[(X-Men|Marvel Knights|SHIELD|Avengers|Covert|Strength|Instinct|Ranged|Tech)\]"
                 r".*(Hero|Ally).*(or gain|or discard|or KO|or put|or gains)", all_text, re.I):
        counters.add("multi-class")
    # [Adapt] changes mechanic dynamically
    if re.search(r"\[Adapt\]", all_text, re.I):
        counters.add("multi-class")
    # "may either recruit or attack" restriction
    if re.search(r"may either recruit or attack this turn", all_text, re.I):
        counters.add("multi-class")
        counters.add("heavy-hitter")

    # ── SPECIAL COUNTERS ─────────────────────────────────────────────────────
    # Conqueror mechanic
    if re.search(r"\[Conqueror|Conqueror \d", all_text, re.I):
        counters.add("conqueror")
    # Mastermind self-Wound mechanic
    if re.search(r"\[Wound the Mastermind\]|\[Wound Mastermind\]", all_text, re.I):
        counters.add("wound-deal")
    # Cyber-Mod 2099
    if re.search(r"\[Cyber-Mod\]", all_text, re.I):
        counters.add("undercover")
    # Time-travel mechanics
    if re.search(r"Man (or Woman )?Out of Time|Woman Out of Time|Time Incursion", all_text, re.I):
        counters.add("time-travel")
    if re.search(r"take another turn", all_text, re.I):
        counters.add("time-travel")
    # Bystander Stack used as mastermind cards
    if re.search(r"Bystander Stack.*ascends|ascends.*Bystander Stack|from the Bystander Stack", all_text, re.I):
        counters.add("bystander-rescue")
    # KO Bystanders from VP
    if re.search(r"(Master Strike|Fight):.*KO(s)?.*(Bystander|bystanders)", all_text, re.I):
        counters.add("bystander-control")
    # KO Villains from VP → need fast VP → heavy-hitter
    if re.search(r"(Master Strike|Fight):.*KO(s)? (a |one )?(Villain|Hydra|Warbound)", all_text, re.I):
        counters.add("heavy-hitter")
    # HQ disruption (push Heroes out of HQ)
    if re.search(r"Hero(es)? from the HQ (into|to) (the|your)|put.*Hero.*from.*HQ", all_text, re.I):
        counters.add("recruit-boost")
        counters.add("top-deck-control")
    # Command Strike: [Demolish] → discard-attack
    if re.search(r"Command Strike:.*\[demolish\]", all_text, re.I):
        counters.add("discard-attack")
        counters.add("extra-draws")

    # ── KING HYPERION: charges through city, escapes = Wounds ────────────────
    if re.search(r"\[charges?\]|charges? (one|two|three|\d+) space", all_text, re.I):
        counters.add("villain-control")
        counters.add("heavy-hitter")
    if re.search(r"Escape:.*gains? (a |two )?Wound", all_text, re.I):
        counters.add("wound-removal")
        counters.add("heavy-hitter")

    # ── MYSTERIO / scheme acceleration: Scheme Twists put on top ────────────
    if re.search(r"(Scheme Twist|Master Strike).*on top of (the Villain|that) Deck", all_text, re.I):
        counters.add("heavy-hitter")  # need to beat quickly before scheme advances

    # ── FATEFUL RESURRECTION: must fight multiple times ───────────────────────
    if re.search(r"\[Fateful Resurrection\]", all_text, re.I):
        counters.add("heavy-hitter")

    # ── TELEPATHIC PAWNS / BOUND SOULS type (Villains exp.) ─────────────────
    if re.search(r"Telepathic Pawn|gets \+\d+\[Attack\] for each (Ally|card) stacked", all_text, re.I):
        counters.add("deck-thinning")
        counters.add("heavy-hitter")

    # ── MYSTERIO: Strike becomes extra Tactic / plays more Master Strikes ────
    if re.search(r"(Shuffle this Master Strike into|becomes a Mastermind Tactic)", all_text, re.I):
        counters.add("heavy-hitter")   # must defeat all tactics quickly
    if re.search(r"Play all the Master Strikes", all_text, re.I):
        counters.add("heavy-hitter")
        counters.add("deck-thinning")  # clean deck helps survive accidental strikes

    # ── "reveals [X] Ally/Hero or gains Bindings" (Villains exp.) ────────────
    if re.search(r"\[Brotherhood\].*or gains? (a )?Bindings?|reveals?.*or gains? (a )?Bindings?", all_text, re.I):
        counters.add("multi-class")

    # ── ATTACK LEVEL ────────────────────────────────────────────────────────
    attack_values = [int(m) for m in re.findall(r"\b(\d+)\[Attack\]", all_text)]
    max_attack = max(attack_values, default=0)
    if max_attack >= 8:
        counters.add("heavy-hitter")
        counters.add("recruit-boost")
    elif max_attack >= 6:
        counters.add("heavy-hitter")

    # ── FALLBACK ─────────────────────────────────────────────────────────────
    if not counters and max_attack >= 5:
        counters.add("heavy-hitter")

    return sorted(counters)


def main():
    with open(CARDS_JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)

    masterminds = data.get("masterminds", [])
    changed = 0

    for m in masterminds:
        counters = derive_mastermind_counters(m.get("cards", []))
        if counters != m.get("countersNeeded", []):
            m["countersNeeded"] = counters
            changed += 1

    print(f"Updated {changed}/{len(masterminds)} masterminds.")

    with open(CARDS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Saved to {CARDS_JSON_PATH}")
    print()

    # Stats
    from collections import Counter
    all_tags = Counter()
    no_counters = []
    for m in masterminds:
        cn = m.get("countersNeeded", [])
        if not cn:
            no_counters.append(m["name"])
        for tag in cn:
            all_tags[tag] += 1

    print("=== TOP countersNeeded TAGS ===")
    for tag, cnt in all_tags.most_common():
        print(f"  {tag}: {cnt}")
    print()
    print(f"Masterminds with no counters: {len(no_counters)}")
    for n in no_counters:
        print(f"  {n}")
    print()

    # Sample output
    print("=== SAMPLE OUTPUT ===")
    sample_names = ["Kang the Conqueror", "Morgan Le Fay", "Annihilus",
                    "Sinister Six 2099", "Magneto", "Thanos", "Galactus"]
    for m in masterminds:
        if m["name"] in sample_names:
            print(f"{m['name']}:")
            print(f"  countersNeeded: {m['countersNeeded']}")


if __name__ == "__main__":
    main()






