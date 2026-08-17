#!/usr/bin/env python3
"""
Skrypt przypisujący primaryClasses, keywords i countersProvided do bohaterów
w pliku cards.json na podstawie tekstów ich kart.
"""

import json
import re
from collections import Counter
from pathlib import Path

CARDS_JSON_PATH = Path(__file__).parent.parent / "src/assets/cards.json"

# ──────────────────────────────────────────────
# 1. KEYWORD PATTERNS
# Klucz = co szukamy w abilities, wartość = nazwa słowa kluczowego
# ──────────────────────────────────────────────
KEYWORD_PATTERNS: list[tuple[str, str]] = [
    # exact bracket keywords
    (r"\[Size-Changing\]",         "Size-Changing"),
    (r"Size-Changing",             "Size-Changing"),
    (r"\[Teleport\]",              "Teleport"),
    (r"\[Dodge\]",                 "Dodge"),
    (r"\[Phasing\]",               "Phasing"),
    (r"Undercover",                "Undercover"),
    (r"Man Out of Time",           "Man Out of Time"),
    (r"Woman Out of Time",         "Woman Out of Time"),
    (r"Fated Future",              "Fated Future"),
    (r"Cyber-Mod",                 "Cyber-Mod"),
    (r"\[Ambush\]",                "Ambush"),
    (r"Cheering Crowds",           "Cheering Crowds"),
    (r"Versatile",                 "Versatile"),
    (r"Conqueror",                 "Conqueror"),
    (r"\[Savior\]",                "Savior"),
    (r"\[Empowered\]",             "Empowered"),
    (r"\[Demolish\]",              "Demolish"),
    (r"Divided Card",              "Divided Card"),
    (r"\[Focus",                   "Focus"),
    (r"Dark Memories",             "Dark Memories"),
    (r"Throne'?s Favor",           "Throne's Favor"),
    (r"\[Sidekick\]",              "Sidekick"),
    (r"\[Unleash\]",               "Unleash"),
    (r"Wound the Mastermind",      "Wound Mastermind"),
    (r"Wound (a |each |the )?Villain",  "Wound Villain"),
    (r"\[Teleport\]",              "Teleport"),
    (r"Microscopic Size-Changing", "Microscopic Size-Changing"),
    (r"Conqueror",                 "Conqueror"),
    # Additional mechanics
    (r"\[Investigate\]",           "Investigate"),
    (r"\[Patrol",                  "Patrol"),
    (r"\[Thrown Artifact\]|\[Artifact\]", "Artifact"),
    (r"\[Wounded Fury\]",          "Wounded Fury"),
    (r"\[Smash",                   "Smash"),
    (r"\[Transform\]",             "Transform"),
    (r"\[Man Out of Time\]",       "Man Out of Time"),
    (r"\[Woman Out of Time\]",     "Woman Out of Time"),
    (r"\[Hunt for Victims\]",      "Hunt for Victims"),
    (r"Patrol the Streets",        "Patrol"),
]

# ──────────────────────────────────────────────
# 2. COUNTER PATTERNS
# Determines what "strategic roles" a hero fulfils
# ──────────────────────────────────────────────
def derive_counters(hero: dict) -> list[str]:
    counters: set[str] = set()
    all_abilities = " ".join(c.get("abilities", "") for c in hero.get("cards", []))
    all_abilities_lower = all_abilities.lower()

    # Bystander rescue
    if re.search(r"rescue a bystander|rescue (the|this) bystander", all_abilities, re.I):
        counters.add("bystander-rescue")

    # Deck thinning (KO cards)
    if re.search(r"KO (a|one|two|up to) card(s)? from your (hand|discard|hand or discard|deck)", all_abilities, re.I):
        counters.add("deck-thinning")
    if re.search(r"KO (it|this|one of them|them)", all_abilities, re.I):
        counters.add("deck-thinning")

    # Extra card draw
    if re.search(r"draw (a|two|three|an extra|extra) card", all_abilities, re.I):
        counters.add("extra-draws")
    if re.search(r"draw (one|1|2|3) (of them|card)", all_abilities, re.I):
        counters.add("extra-draws")

    # Wound removal / healing
    if re.search(r"KO (a |the |up to two )?wound", all_abilities, re.I):
        counters.add("wound-removal")
    if re.search(r"return (that wound|a wound) to the wound stack", all_abilities, re.I):
        counters.add("wound-removal")
    if re.search(r"send (this|a)? ?wound (from .+)? ?\[undercover\]", all_abilities, re.I):
        counters.add("wound-removal")

    # Wound dealing (to villains/mastermind)
    if re.search(r"\[Wound (the Mastermind|a Villain|each Villain)", all_abilities):
        counters.add("wound-deal")

    # Recruit boost
    total_recruit = sum(
        c.get("quantity", 1)
        for c in hero.get("cards", [])
        if str(c.get("recruit", "0")) not in ("0", "0+")
    )
    total_cards = sum(c.get("quantity", 1) for c in hero.get("cards", []))
    if total_cards > 0 and total_recruit / total_cards >= 0.35:
        counters.add("recruit-boost")

    # Undercover mechanic
    if "undercover" in all_abilities_lower:
        counters.add("undercover")

    # Sidekick generation
    if re.search(r"gain a \[sidekick\]|gain a sidekick", all_abilities, re.I):
        counters.add("sidekick")

    # SHIELD synergy
    if re.search(r"s\.?h\.?i\.?e\.?l\.?d\.", all_abilities, re.I) or \
       re.search(r"\[S\.H\.I\.E\.L\.D\.\]", all_abilities):
        counters.add("shield-synergy")

    # Villain control (move villains)
    if re.search(r"move a villain|swap (villains|them)", all_abilities, re.I):
        counters.add("villain-control")

    # Top-deck / hand manipulation
    if re.search(r"(look at|reveal) the top (two|three|\d+)? ?card", all_abilities, re.I):
        counters.add("top-deck-control")
    if re.search(r"put (it|the rest|them|a card) back", all_abilities, re.I):
        counters.add("top-deck-control")

    # Discard effects (self-discard for benefit, or discard attack)
    if re.search(r"(you may discard a card|discarded any cards this turn|discard a card)", all_abilities, re.I):
        counters.add("discard")
    if re.search(r"\[Demolish\]", all_abilities):
        counters.add("discard-attack")

    # Investigate mechanic (Spider-Man Noir etc.) - can lead to bystander rescue
    if re.search(r"\[Investigate\]", all_abilities):
        counters.add("bystander-rescue")
        counters.add("deck-thinning")

    # Patrol mechanic (Elsa Bloodstone)
    if re.search(r"\[Patrol", all_abilities):
        counters.add("location-control")

    # Artifact mechanic (Greithoth, Fear Itself heroes)
    if re.search(r"\[Artifact\]|\[Thrown Artifact\]|control an \[Artifact\]", all_abilities):
        counters.add("artifact-synergy")

    # Wounded Fury / Smash / Transform (Skaar, Fear Itself)
    if re.search(r"\[Wounded Fury\]|\[Smash", all_abilities):
        counters.add("wound-synergy")
        counters.add("heavy-hitter")

    # Transform mechanic
    if re.search(r"\[Transform\]", all_abilities):
        counters.add("transform")

    # Ally / Lair mechanics (Villains expansion heroes)
    if re.search(r"the Lair|Ally Deck|HYDRA Ally|\[Ally\]", all_abilities, re.I):
        counters.add("villain-ally-synergy")

    # Dodge-based discard effects
    if re.search(r"\[Dodge\]", all_abilities) and re.search(r"discard|kidnap|attack", all_abilities, re.I):
        counters.add("dodge-offense")

    # Hunt for Victims / City Patrol mechanics
    if re.search(r"\[Hunt for Victims\]|Patrol the Streets", all_abilities, re.I):
        counters.add("city-control")

    # Henchman synergy
    if re.search(r"henchman", all_abilities, re.I):
        counters.add("henchman-synergy")

    # Multi-class synergy
    if re.search(r"each (hero )?class you have|different (hero )?class", all_abilities, re.I):
        counters.add("multi-class")

    # Size-changing synergy
    if re.search(r"\[Size-Changing\]|Microscopic Size-Changing", all_abilities):
        counters.add("size-changing")

    # Time-travel
    if re.search(r"Man Out of Time|Woman Out of Time", all_abilities):
        counters.add("time-travel")

    # Ambush
    if re.search(r"\[Ambush\]", all_abilities):
        counters.add("ambush")

    # Focus
    if re.search(r"\[Focus", all_abilities):
        counters.add("focus")

    # Empowered synergy
    if re.search(r"\[Empowered\]", all_abilities):
        counters.add("empowered")

    # Savior synergy
    if re.search(r"\[Savior\]", all_abilities):
        counters.add("savior")

    # Conqueror abilities
    if re.search(r"Conqueror", all_abilities):
        counters.add("conqueror")

    # Dark Memories
    if re.search(r"Dark Memories", all_abilities):
        counters.add("dark-memories")

    # AoE (affects multiple villains)
    if re.search(r"each villain|all villains|wound (villains|each villain)", all_abilities, re.I):
        counters.add("aoe")

    # High attack potential (signal for heavy hitter)
    high_attack_cards = [
        c for c in hero.get("cards", [])
        if c.get("quantity", 0) in (1, 3) and
           re.match(r"[5-9]|\d{2}", str(c.get("attack", "0")))
    ]
    if high_attack_cards:
        counters.add("heavy-hitter")

    return sorted(counters)


# ──────────────────────────────────────────────
# 3. PRIMARY CLASSES
# ──────────────────────────────────────────────
def derive_primary_classes(hero: dict) -> list[str]:
    """
    Zlicza klasy kart (ważone przez ilość) i zwraca klasy dominujące
    (te które stanowią >= 33% talii lub top-1 jeśli brak).
    """
    class_counts: Counter = Counter()
    total = 0
    for card in hero.get("cards", []):
        qty = card.get("quantity", 1)
        cls = card.get("class", "")
        if cls:
            class_counts[cls] += qty
            total += qty

    if not total:
        return []

    primary: list[str] = []
    threshold = total * 0.33

    # Sort by count descending
    sorted_classes = class_counts.most_common()
    top_count = sorted_classes[0][1] if sorted_classes else 0

    for cls, cnt in sorted_classes:
        if cnt >= threshold or cnt == top_count:
            primary.append(cls)
        # Stop once we've taken enough classes
        if len(primary) >= 2 and cnt < threshold:
            break

    return primary


# ──────────────────────────────────────────────
# 4. KEYWORDS
# ──────────────────────────────────────────────
def derive_keywords(hero: dict) -> list[str]:
    """
    Wyciąga słowa kluczowe z tekstów kart, deduplikuje i sortuje.
    """
    all_abilities = " ".join(c.get("abilities", "") for c in hero.get("cards", []))
    found: set[str] = set()

    seen_patterns: set[str] = set()
    for pattern, keyword in KEYWORD_PATTERNS:
        if pattern in seen_patterns:
            continue
        seen_patterns.add(pattern)
        if re.search(pattern, all_abilities, re.I):
            found.add(keyword)

    # "Microscopic Size-Changing" is more specific than "Size-Changing"
    if "Microscopic Size-Changing" in found and "Size-Changing" in found:
        found.discard("Size-Changing")  # keep more specific

    return sorted(found)


# ──────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────
def main():
    with open(CARDS_JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)

    heroes = data.get("heroes", [])
    changed = 0

    for hero in heroes:
        primary_classes = derive_primary_classes(hero)
        keywords = derive_keywords(hero)
        counters = derive_counters(hero)

        old_pc = hero.get("primaryClasses", [])
        old_kw = hero.get("keywords", [])
        old_cp = hero.get("countersProvided", [])

        if primary_classes != old_pc or keywords != old_kw or counters != old_cp:
            hero["primaryClasses"] = primary_classes
            hero["keywords"] = keywords
            hero["countersProvided"] = counters
            changed += 1

    print(f"Updated {changed}/{len(heroes)} heroes.")

    # Write back
    with open(CARDS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Saved to {CARDS_JSON_PATH}")

    # Print sample output for first 5 heroes
    print("\nSample output (first 5 heroes):")
    for h in heroes[:5]:
        print(f"\n  {h['name']}:")
        print(f"    primaryClasses: {h['primaryClasses']}")
        print(f"    keywords:       {h['keywords']}")
        print(f"    countersProvided: {h['countersProvided']}")


if __name__ == "__main__":
    main()



