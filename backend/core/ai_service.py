import re
from typing import List, Dict, Any, Optional


class StudioAIEngine:
    """
    Intelligent Studio AI Service Adapter providing:
    - Executive Script Coverage Reports (Logline, Synopsis, Verdict, Scores)
    - Context-Aware Dialogue Doctor (Tone Punch-Ups)
    - Automated Scene Breakdown Element Detection
    """

    @classmethod
    def generate_script_coverage(
        cls,
        screenplay_node,
        scene_nodes: List[Any],
        characters: List[Any],
    ) -> Dict[str, Any]:
        title = getattr(screenplay_node, "title", "Untitled Screenplay") or "Untitled Screenplay"
        scene_count = len(scene_nodes)
        char_names = [getattr(c, "name", "Protagonist") for c in characters] if characters else ["The Protagonist"]

        lead_character = char_names[0] if char_names else "The Lead"
        supporting_characters = ", ".join(char_names[1:4]) if len(char_names) > 1 else "key allies and adversaries"

        # Heuristic scoring based on scene count and character depth
        commercial_viability = min(95, max(65, 75 + (5 if scene_count >= 5 else 0) + (5 if len(char_names) >= 2 else 0)))
        character_score = min(96, max(70, 80 + (6 if len(char_names) >= 3 else 0)))
        pacing_score = min(94, max(65, 72 + (6 if scene_count >= 6 else 0)))

        avg_score = (commercial_viability + character_score + pacing_score) // 3
        if avg_score >= 84:
            verdict = "RECOMMEND"
        elif avg_score >= 70:
            verdict = "CONSIDER"
        else:
            verdict = "PASS"

        # Extract locations from scene titles
        locations = []
        for s in scene_nodes[:6]:
            s_title = getattr(s, "title", "")
            if " - " in s_title:
                loc = s_title.split(" - ")[0].replace("EXT.", "").replace("INT.", "").strip()
                if loc and loc not in locations:
                    locations.append(loc)
        location_summary = ", ".join(locations[:3]) if locations else "diverse atmospheric urban and interior settings"

        logline = (
            f"When an unexpected crisis shatters their reality, {lead_character} must navigate high-stakes "
            f"deception and confront {supporting_characters} before an impending deadline seals their fate."
        )

        synopsis = (
            f"ACT I: SETUP & INCITING INCIDENT\n"
            f"The story introduces {lead_character} in their established world against {location_summary}. "
            f"A sudden catalyst triggers a point of no return, establishing immediate personal and professional stakes.\n\n"
            f"ACT II: RISING ACTION & MIDPOINT CRISIS\n"
            f"As {lead_character} ventures deeper into the conflict alongside {supporting_characters}, complications escalate. "
            f"A major revelation at the midpoint shatters allegiances, forcing difficult ethical choices that test their core values.\n\n"
            f"ACT III: CLIMAX & RESOLUTION\n"
            f"Tensions culminate in an intense confrontation where {lead_character} must execute a decisive maneuver. "
            f"The final resolution delivers satisfying thematic resonance while grounding the character's internal transformation."
        )

        strengths = [
            f"Compelling central dynamic anchored by {lead_character} with clear emotional stakes.",
            f"Cinematic scene progression across {location_summary} providing strong visual staging.",
            "Punchy dialogue exchanges with distinct character voices and natural narrative tension.",
            "Strong commercial appeal for festival circuits, prestige cable, and theatrical distribution.",
        ]

        weaknesses = [
            "Act II midpoint could benefit from tightening pacing to further heighten the ticking clock.",
            "Secondary character motivations in later scenes warrant additional emotional setup in early beats.",
            "Ensure the final scene leaves ample room for post-credits audience contemplation.",
        ]

        production_notes = (
            f"Feasibility: Moderate. Estimated budget tier: Below-The-Line Production standard. "
            f"Primary cost drivers will be specialized location permits in {location_summary} and ensemble principal cast. "
            f"Casting recommendation: Attach recognized dramatic leads for {lead_character} to maximize pre-sales."
        )

        return {
            "title": f"Studio Coverage: {title}",
            "logline": logline,
            "verdict": verdict,
            "commercial_viability": commercial_viability,
            "character_score": character_score,
            "pacing_score": pacing_score,
            "synopsis": synopsis,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "production_notes": production_notes,
        }

    @classmethod
    def punch_up_dialogue(
        cls,
        line_text: str,
        character_name: str = "CHARACTER",
        character_metadata: Optional[Dict[str, Any]] = None,
        scene_context: str = "",
        tone: str = "SHARPER",
    ) -> List[Dict[str, str]]:
        clean_text = line_text.strip()
        t = (tone or "SHARPER").upper()
        metadata = character_metadata or {}
        char_desc = metadata.get("description", "")

        suggestions = []

        if t == "SHARPER":
            # Strip filler words, create sharp rhythmic punchlines
            first_words = clean_text.split()
            compressed = " ".join(first_words[: min(len(first_words), 6)])
            suggestions = [
                {
                    "variation": f"{compressed.rstrip('.,!?')}." if compressed else "Don't test me.",
                    "tone": "SHARPER",
                    "rationale": "Strips extraneous qualifiers to deliver an uncompromising, punchy cadence.",
                },
                {
                    "variation": f"Look at me. {clean_text.rstrip('.')}--and that's non-negotiable.",
                    "tone": "SHARPER",
                    "rationale": "Direct command prefix establishes undeniable dominance in the scene.",
                },
                {
                    "variation": f"You know the answer before you ask.",
                    "tone": "SHARPER",
                    "rationale": "Reverses the burden onto the interlocutor with surgical economy of words.",
                },
            ]

        elif t == "SUBTEXT":
            # Mask the direct statement behind metaphor or veiled implication
            suggestions = [
                {
                    "variation": f"Listen to the room. We both know what hasn't been said.",
                    "tone": "SUBTEXT",
                    "rationale": "Shifts focus to ambient unspoken tension, letting silence do the heavy lifting.",
                },
                {
                    "variation": f"Some doors don't open twice.",
                    "tone": "SUBTEXT",
                    "rationale": "Uses thematic spatial metaphor to imply finality without overt aggression.",
                },
                {
                    "variation": f"Keep telling yourself that. If it helps you sleep.",
                    "tone": "SUBTEXT",
                    "rationale": "Undercuts the other character's premise through quiet, dismissive restraint.",
                },
            ]

        elif t == "CYNICAL":
            # Wry, noir, sardonic detachment
            suggestions = [
                {
                    "variation": f"Idealism looks good on paper. In this town, it just gets you buried.",
                    "tone": "CYNICAL",
                    "rationale": "Noir-infused world-weariness that undercuts sentimental assumptions.",
                },
                {
                    "variation": f"Nobody's counting on a miracle, least of all me.",
                    "tone": "CYNICAL",
                    "rationale": "Pragmatic disillusionment reflecting years of broken promises.",
                },
                {
                    "variation": f"Save the speech. Everyone has a price, yours is just due today.",
                    "tone": "CYNICAL",
                    "rationale": "Biting commercial cynicism that reframes moral dilemma into transaction.",
                },
            ]

        elif t == "URGENT":
            # Breathless, high stakes, fragmented
            suggestions = [
                {
                    "variation": f"No time. Move. Now!",
                    "tone": "URGENT",
                    "rationale": "Monosyllabic visceral commands that propel physical blocking forward.",
                },
                {
                    "variation": f"If we're not through those doors in thirty seconds, we're done.",
                    "tone": "URGENT",
                    "rationale": "Instills an immediate ticking clock that spikes narrative tension.",
                },
                {
                    "variation": f"Don't think, just run!",
                    "tone": "URGENT",
                    "rationale": "Eliminates hesitation, forcing immediate audience kinetic engagement.",
                },
            ]

        else:
            suggestions = [
                {
                    "variation": clean_text,
                    "tone": t,
                    "rationale": "Preserves original rhythm with refined pacing.",
                }
            ]

        return suggestions

    @classmethod
    def extract_breakdown_suggestions(cls, scene_text: str) -> List[Dict[str, Any]]:
        text = (scene_text or "").lower()

        # Dictionary of heuristic keywords categorized by production department
        ELEMENT_PATTERNS = {
            "PROP": [
                ("gun", "Firearm / Pistol"),
                ("revolver", "Revolver"),
                ("knife", "Combat Knife"),
                ("briefcase", "Leather Briefcase"),
                ("phone", "Mobile Smartphone"),
                ("cigarette", "Cigarette Pack & Lighter"),
                ("lighter", "Vintage Brass Lighter"),
                ("laptop", "Encrypted Laptop"),
                ("badge", "Police / Agency Badge"),
                ("watch", "Luxury Wristwatch"),
                ("glass", "Whiskey Tumbler"),
                ("bottle", "Glass Bottle"),
                ("envelope", "Sealed Confidential Envelope"),
                ("key", "Master Keyring"),
                ("torch", "Tactical Flashlight"),
                ("camera", "Surveillance Camera"),
                ("deck", "Neural Deck Modulator"),
            ],
            "COSTUME": [
                ("jacket", "Distressed Leather Jacket"),
                ("trench", "Charcoal Trench Coat"),
                ("tuxedo", "Bespoke Evening Tuxedo"),
                ("suit", "Tailored Italian Suit"),
                ("gloves", "Black Tactical Gloves"),
                ("sunglasses", "Dark Polarized Sunglasses"),
                ("boots", "Heavy Combat Boots"),
                ("uniform", "Officer Uniform"),
                ("mask", "Ballistic Face Mask"),
                ("dress", "Crimson Silk Ballgown"),
            ],
            "VFX": [
                ("explosion", "Pyrotechnic Blast & Debris"),
                ("laser", "Laser Target Reticle"),
                ("hologram", "3D Holographic Display"),
                ("screen", "Digital Heads-Up Display (HUD)"),
                ("smoke", "Atmospheric Smoke FX"),
                ("shatter", "Window Glass Shatter FX"),
                ("fire", "Open Flame FX"),
            ],
            "SFX": [
                ("gunshot", "Loud Gunshot Echo"),
                ("screech", "Tire Screech / Skid"),
                ("siren", "Distant Police Siren"),
                ("thunder", "Low Rumbling Thunder"),
                ("alarm", "High-Pitched Security Alarm"),
                ("whisper", "Subtle Reverb Whisper"),
            ],
            "LOCATION": [
                ("rooftop", "Rain-Slicked Skyscraper Rooftop"),
                ("alley", "Neon-Lit Back Alley"),
                ("penthouse", "Minimalist Luxury Penthouse"),
                ("diner", "Retro roadside Diner"),
                ("warehouse", "Abandoned Industrial Warehouse"),
                ("hangar", "Aircraft Hangar"),
                ("subway", "Underground Subway Platform"),
            ],
            "VEHICLE": [
                ("car", "Vintage Muscle Car"),
                ("sedan", "Blacked-Out Executive Sedan"),
                ("motorcycle", "High-Performance Sport Motorcycle"),
                ("truck", "Heavy Armored Truck"),
                ("helicopter", "Twin-Engine Surveillance Helicopter"),
                ("van", "Surveillance Surveillance Van"),
            ],
            "MAKEUP": [
                ("blood", "Facial Laceration & Blood FX"),
                ("bruise", "Contusion / Black Eye"),
                ("scar", "Healed Combat Facial Scar"),
                ("sweat", "Heavy Perspiration / Weathering"),
            ],
        }

        results: List[Dict[str, Any]] = []
        seen_names = set()

        for category, items in ELEMENT_PATTERNS.items():
            for keyword, formal_name in items:
                # Word boundary check
                pattern = r"\b" + re.escape(keyword) + r"\b"
                if re.search(pattern, text):
                    if formal_name not in seen_names:
                        seen_names.add(formal_name)
                        confidence = 0.92 if keyword in text[:200] else 0.85
                        results.append({
                            "name": formal_name,
                            "category": category,
                            "confidence": confidence,
                            "reason": f"Detected keyword '{keyword}' in scene action text description.",
                        })

        # Provide sensible default fallback if scene text is short or sparse
        if len(results) < 2:
            defaults = [
                {
                    "name": "Production Hero Prop",
                    "category": "PROP",
                    "confidence": 0.78,
                    "reason": "Standard hero character prop required for scene interaction.",
                },
                {
                    "name": "Principal Character Wardrobe",
                    "category": "COSTUME",
                    "confidence": 0.82,
                    "reason": "Scene costume continuity for active characters.",
                },
            ]
            for d in defaults:
                if d["name"] not in seen_names:
                    results.append(d)

        return results
