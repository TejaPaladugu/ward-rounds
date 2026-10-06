# Ward Rounds

A browser game for reviewing internal medicine for USMLE Step 2 CK and the IM shelf. It started as a pulmonary-only game ("Pulm Rounds") and now covers every IM subject.

You walk into a 3D exam room, take a history, examine the patient by clicking body regions, and order tests. Every action advances the clock, and orders cost money. Some results won't help. When you're ready, commit to a diagnosis and pick a management plan.

## Reading studies

X-rays, CTs, ECGs, ultrasounds, peripheral smears, urine sediment, synovial fluid, and Gram stains come back as **images you read yourself**. You pick every finding you see from a list, and only then is the official report released. Each read is scored by overlap with the true findings (|picked ∩ true| / |picked ∪ true|). Unread studies score 0.

Images are drawn procedurally from the case's findings (`js/imaging.js`). They're schematic teaching images, not real patient studies.

## Scoring (100)

| Part | Points | What counts |
|---|---|---|
| Diagnosis | 35 | Partial credit for close calls |
| Management | 35 | Essential and helpful orders add; not-indicated and harmful ones subtract |
| Efficiency | 15 | Time and cost against a target; low-yield and harmful tests; skipping every key finding |
| Image reads | 15 | Average read score across studies you ordered (scaled out if you ordered none) |

## Cases (40)

Organized into three tiers by how common the condition is and how complex the patient is:

- **Tier 1 · Bread & butter:** COPD exacerbation, CAP, OSA, STEMI, acute heart failure, AF with RVR, upper GI bleed, pancreatitis, hyperkalemia, DKA, iron deficiency (colon cancer), urosepsis, gout
- **Tier 2 · Core shelf:** asthma, PE, tension pneumothorax, empyema, TB, SCLC with SIADH, cholangitis, SBP, rhabdomyolysis, thyroid storm, myeloma, acute chest syndrome, meningitis, endocarditis, lupus nephritis, giant cell arteritis, stroke, acetaminophen overdose
- **Tier 3 · Zebras & complex:** sarcoidosis, IPF, ARDS, aortic dissection, adrenal crisis, TTP, HIT, PJP with new HIV, myasthenic crisis

Unstable patients deteriorate on the monitor as the clock runs. The 3D patient shows visible signs: jaundice, pallor, cyanosis, clubbing, JVD, tracheal deviation, malar rash, ascites, edema, a gouty toe, petechiae, proptosis, ptosis, facial droop, and track marks.

## Files

- `index.html`: layout and styles
- `js/data.js`: tests, history questions, exam systems, diagnoses, and image-finding vocabularies
- `js/cases-*.js`: cases grouped by subject
- `js/imaging.js`: the image renderer for every modality
- `js/scene.js`: the Three.js room and patient
- `js/game.js`: game state, reading, scoring, and UI

## Running it

Open `index.html` in a modern browser. It loads Three.js r128 from cdnjs, so it needs an internet connection. There's no build step.

Clinical content follows common Step 2 CK teaching and is for study only. Verify anything that matters against current guidelines.
