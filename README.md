# Ward Rounds

A browser game for reviewing internal medicine for USMLE Step 2 CK and the IM shelf. It started as a pulmonary-only game ("Pulm Rounds") and now covers every IM subject.

You walk into a 3D exam room, take a history, examine the patient by clicking body regions, and order tests. Every action advances the clock, and orders cost money. Some results won't help. When you're ready, commit to a diagnosis and pick a management plan.

## Reading studies

X-rays, CTs, ECGs, ultrasounds, peripheral smears, urine sediment, synovial fluid, and Gram stains come back as **images you read yourself**. You pick every finding you see from a list, and only then is the official report released. Each read is scored by overlap with the true findings (|picked ∩ true| / |picked ∪ true|). Unread studies score 0.

Images are drawn procedurally from the case's findings (`js/imaging.js`). They're schematic teaching images, not real patient studies.

## Modes

- **Graded:** no hints. Your best score per case is saved.
- **Guided practice:** a coach lists the step-by-step approach and checks steps off as you do them. Key questions and exam items are flagged, every test shows its yield before you order it, and results explain themselves as they arrive. Scores aren't saved.

## Realistic time

History questions take seconds (about 2 minutes for the opening story). Exam maneuvers take bedside time, from 15 seconds for a glance to 4 minutes for a full neuro exam. In the ED and on the wards, tests return at STAT turnaround. In clinic, labs come back the next day, imaging in days, and procedures in weeks.

## Exam features

- **Gown:** remove it for a full skin exam (spider angiomas, caput medusae, gynecomastia, sternotomy scar). The chaperoned GU exam uses schematic genitalia.
- **Close-ups:** inside the mouth (thrush, palatal ulcers, glossitis, pigmentation, Mallampati IV), the eyes (icterus, conjunctival pallor, proptosis, ptosis), and the hands (clubbing, spoon nails, splinter hemorrhages, palmar erythema).
- **Animations:** gait exam with a walking patient (normal, Parkinson shuffle, NPH magnetic, B12 sensory ataxia with a Romberg sway, antalgic), resting tremor, fine tremor, asterixis, Kussmaul breathing, and asymmetric chest rise.

## Scoring (100)

| Part | Points | What counts |
|---|---|---|
| Diagnosis | 30 | Partial credit for close calls |
| Management | 30 | Essential and helpful orders add; not-indicated and harmful ones subtract |
| Triage | 10 | Emergent / urgent admit / prompt outpatient / routine / watchful waiting |
| Efficiency | 15 | Time and cost against a target; low-yield and harmful tests; skipping every key finding |
| Image reads | 15 | Average read score across studies you ordered (scaled out if you ordered none) |

After submitting, the debrief shows the triage rationale, the step-by-step approach in priority order (marking what you did), and the recommended workup with the reason for each test.

## Cases (52)

Organized into three tiers by how common the condition is and how complex the patient is:

- **Tier 1 · Bread & butter:** COPD exacerbation, CAP, OSA, STEMI, acute heart failure, AF with RVR, upper GI bleed, pancreatitis, hyperkalemia, DKA, iron deficiency (colon cancer), urosepsis, gout
- **Tier 2 · Core shelf:** asthma, PE, tension pneumothorax, empyema, TB, SCLC with SIADH, cholangitis, SBP, rhabdomyolysis, thyroid storm, myeloma, acute chest syndrome, meningitis, endocarditis, lupus nephritis, giant cell arteritis, stroke, acetaminophen overdose
- **Tier 3 · Zebras & complex:** sarcoidosis, IPF, ARDS, aortic dissection, adrenal crisis, TTP, HIT, PJP with new HIV, myasthenic crisis, normal pressure hydrocephalus
- **Added for triage practice:** incidental lung nodule, acute bronchitis, subclinical hypothyroidism, asymptomatic gallstones, MGUS, asymptomatic hyperparathyroidism (watchful waiting); low-risk chest pain (safe discharge); C. difficile (inpatient); Parkinson disease, B12 deficiency, disseminated gonococcal infection

Each case is tagged ED (27), inpatient (12), or outpatient (13).

Unstable patients deteriorate on the monitor as the clock runs. The 3D patient shows visible signs: jaundice, pallor, cyanosis, clubbing, JVD, tracheal deviation, malar rash, ascites, edema, a gouty toe, petechiae, proptosis, ptosis, facial droop, and track marks.

## Files

- `index.html`: layout and styles
- `js/data.js`: tests, history questions, exam systems, diagnoses, and image-finding vocabularies
- `js/cases-*.js`: cases grouped by subject (`cases-triage.js` holds the triage and gait cases)
- `js/teaching.js`: care setting, triage level, step-by-step approach, and extra exam findings for the original cases
- `js/closeups.js`: mouth, eye, and hand close-up illustrations
- `js/imaging.js`: the image renderer for every modality
- `js/scene.js`: the Three.js room and patient
- `js/game.js`: game state, reading, scoring, and UI

## Running it

Open `index.html` in a modern browser. It loads Three.js r128 from cdnjs, so it needs an internet connection. There's no build step.

Clinical content follows common Step 2 CK teaching and is for study only. Verify anything that matters against current guidelines.
