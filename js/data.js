"use strict";
/* Shared reference data: tests, history questions, exam systems, diagnoses, and image-finding vocabularies.
   Case files push onto CASES. */
const CASES = [];

const SUBJECTS = ['Cardio','Pulm','GI','Renal','Endo','Heme/Onc','ID','Rheum','Neuro','Tox'];
const TIERS = {
  1: {name:'Bread & butter', blurb:'Common presentations you’re expected to nail.'},
  2: {name:'Core shelf', blurb:'Common but multi-step, time-critical, or easy to mismanage.'},
  3: {name:'Zebras & complex', blurb:'Rare diseases, or patients whose picture is tangled.'},
};

/* img: default image a test produces. An image must be read before its report is shown. */
const TESTS = [
  // Labs
  {id:'cbc', name:'CBC with differential', cat:'Labs', cost:30, min:30, normal:'WBC 7.4 · Hgb 13.9 · MCV 89 · Plt 240'},
  {id:'cmp', name:'Comprehensive metabolic panel', cat:'Labs', cost:45, min:30, normal:'Na 139 · K 4.1 · Cl 103 · HCO3 25 · BUN 14 · Cr 0.9 · Glu 98 · Ca 9.3 · Mg 2.0 · Phos 3.5 · Alb 4.1 · AST 22 · ALT 19 · ALP 80 · T bili 0.6'},
  {id:'abg', name:'Arterial blood gas', cat:'Labs', cost:80, min:15, normal:'pH 7.41 · PaCO2 39 · PaO2 94 · HCO3 24'},
  {id:'lactate', name:'Lactate', cat:'Labs', cost:30, min:20, normal:'Lactate 1.0 mmol/L'},
  {id:'trop', name:'High-sensitivity troponin', cat:'Labs', cost:50, min:45, normal:'hs-Troponin T 5 ng/L (normal)'},
  {id:'bnp', name:'BNP', cat:'Labs', cost:60, min:45, normal:'BNP 38 pg/mL'},
  {id:'ddimer', name:'D-dimer', cat:'Labs', cost:50, min:40, normal:'D-dimer 0.28 µg/mL FEU (negative)'},
  {id:'pct', name:'Procalcitonin', cat:'Labs', cost:90, min:60, normal:'Procalcitonin 0.04 ng/mL'},
  {id:'lipase', name:'Lipase', cat:'Labs', cost:40, min:40, normal:'Lipase 32 U/L'},
  {id:'tg', name:'Triglycerides', cat:'Labs', cost:30, min:45, normal:'Triglycerides 130 mg/dL'},
  {id:'pt', name:'Coagulation panel (PT/INR, PTT, fibrinogen)', cat:'Labs', cost:50, min:40, normal:'INR 1.0 · PTT 30 s · Fibrinogen 310 mg/dL'},
  {id:'tnc', name:'Type and crossmatch', cat:'Labs', cost:80, min:45, normal:'O positive. Antibody screen negative. 2 units crossmatched.'},
  {id:'smear', name:'Peripheral blood smear', cat:'Labs', cost:40, min:30, normal:'Normal red cell morphology. Adequate platelets. Normal white cells.', img:{type:'smear', f:[]}},
  {id:'hemol', name:'Hemolysis panel (LDH, haptoglobin, bilirubin, retic)', cat:'Labs', cost:90, min:45, normal:'LDH 180 · Haptoglobin 120 · Indirect bili 0.4 · Retic 1.2%'},
  {id:'ldh', name:'LDH', cat:'Labs', cost:25, min:30, normal:'LDH 170 U/L'},
  {id:'iron', name:'Iron studies (ferritin, iron, TIBC)', cat:'Labs', cost:90, min:60, normal:'Ferritin 110 · Iron 95 · TIBC 300 · Transferrin sat 32%'},
  {id:'b12', name:'Vitamin B12 and folate', cat:'Labs', cost:80, min:60, normal:'B12 520 pg/mL · Folate 12 ng/mL'},
  {id:'hgbe', name:'Hemoglobin electrophoresis', cat:'Labs', cost:150, min:120, normal:'HbA 97% · HbA2 2.5% · HbF < 1%'},
  {id:'dat', name:'Direct antiglobulin (Coombs) test', cat:'Labs', cost:60, min:45, normal:'Negative'},
  {id:'adamts', name:'ADAMTS13 activity', cat:'Labs', cost:300, min:60, normal:'Activity 85% (normal)'},
  {id:'pf4', name:'PF4–heparin antibody (ELISA)', cat:'Labs', cost:150, min:60, normal:'Negative'},
  {id:'sra', name:'Serotonin release assay', cat:'Labs', cost:300, min:120, normal:'Negative'},
  {id:'spep', name:'SPEP, immunofixation, free light chains', cat:'Labs', cost:250, min:120, normal:'No monoclonal protein. Free light chain ratio 1.1.'},
  {id:'pth', name:'PTH and PTHrP', cat:'Labs', cost:160, min:90, normal:'PTH 42 pg/mL · PTHrP undetectable'},
  {id:'bhb', name:'β-hydroxybutyrate', cat:'Labs', cost:60, min:30, normal:'β-hydroxybutyrate 0.2 mmol/L'},
  {id:'hcg', name:'Pregnancy test (hCG)', cat:'Labs', cost:20, min:15, normal:'Negative'},
  {id:'tsh', name:'TSH and free T4', cat:'Labs', cost:70, min:60, normal:'TSH 1.9 mIU/L · Free T4 1.2 ng/dL'},
  {id:'endo', name:'TSH and AM cortisol (SIADH screen)', cat:'Labs', cost:110, min:60, normal:'TSH 1.9 mIU/L · AM cortisol 15 µg/dL'},
  {id:'cortisol', name:'Serum cortisol and ACTH', cat:'Labs', cost:120, min:60, normal:'Cortisol 14 µg/dL · ACTH 25 pg/mL'},
  {id:'cosyntropin', name:'Cosyntropin stimulation test', cat:'Labs', cost:200, min:60, normal:'Cortisol rises to 24 µg/dL at 30 min (normal)'},
  {id:'osm', name:'Serum & urine osmolality, urine Na', cat:'Labs', cost:90, min:45, normal:'Serum osm 288 · Urine osm 410 · Urine Na 35'},
  {id:'esr', name:'ESR and CRP', cat:'Labs', cost:40, min:45, normal:'ESR 12 mm/h · CRP 0.4 mg/dL'},
  {id:'uric', name:'Uric acid', cat:'Labs', cost:30, min:30, normal:'Uric acid 5.6 mg/dL'},
  {id:'ace', name:'Serum ACE level', cat:'Labs', cost:70, min:60, normal:'ACE 32 U/L (normal)'},
  {id:'auto', name:'Autoimmune panel (ANA, RF, CCP, Scl-70, Jo-1)', cat:'Labs', cost:220, min:60, normal:'All negative'},
  {id:'lupus', name:'Anti-dsDNA, anti-Smith, C3/C4', cat:'Labs', cost:220, min:90, normal:'Anti-dsDNA negative · Anti-Smith negative · C3 120 · C4 28 (normal)'},
  {id:'apl', name:'Antiphospholipid antibodies', cat:'Labs', cost:200, min:90, normal:'Lupus anticoagulant, anticardiolipin, β2-glycoprotein: negative'},
  {id:'a1at', name:'Alpha-1 antitrypsin level', cat:'Labs', cost:120, min:60, normal:'AAT 142 mg/dL (normal)'},
  {id:'hiv', name:'HIV-1/2 antigen/antibody', cat:'Labs', cost:50, min:45, normal:'Nonreactive'},
  {id:'cd4', name:'CD4 count and HIV viral load', cat:'Labs', cost:180, min:120, normal:'CD4 850 cells/µL · Viral load not detected'},
  {id:'bdg', name:'1,3-β-D-glucan', cat:'Labs', cost:150, min:120, normal:'Negative (< 60 pg/mL)'},
  {id:'g6pd', name:'G6PD level', cat:'Labs', cost:70, min:60, normal:'Normal activity'},
  {id:'cea', name:'CEA', cat:'Labs', cost:60, min:60, normal:'CEA 1.8 ng/mL'},
  {id:'nh3', name:'Ammonia', cat:'Labs', cost:50, min:30, normal:'Ammonia 28 µmol/L'},
  {id:'ck', name:'Creatine kinase', cat:'Labs', cost:30, min:30, normal:'CK 110 U/L'},
  {id:'apap', name:'Acetaminophen level', cat:'Labs', cost:40, min:40, normal:'Undetectable'},
  {id:'sal', name:'Salicylate level', cat:'Labs', cost:40, min:40, normal:'Undetectable'},
  {id:'utox', name:'Urine drug screen and serum ethanol', cat:'Labs', cost:60, min:45, normal:'Drug screen negative. Ethanol undetectable.'},
  {id:'achr', name:'Acetylcholine receptor antibodies', cat:'Labs', cost:200, min:120, normal:'Negative'},
  // Urine
  {id:'ua', name:'Urinalysis (dipstick)', cat:'Urine', cost:15, min:20, normal:'SG 1.015 · pH 6 · Negative for protein, blood, glucose, ketones, leukocyte esterase, and nitrite'},
  {id:'ursed', name:'Urine sediment microscopy', cat:'Urine', cost:40, min:30, normal:'Few squamous cells. No casts, cells, or crystals.', img:{type:'urine', f:[]}},
  {id:'ulytes', name:'Urine Na and FENa', cat:'Urine', cost:50, min:40, normal:'Urine Na 40 · FENa 1.2%'},
  {id:'upcr', name:'Urine protein/creatinine ratio', cat:'Urine', cost:30, min:40, normal:'0.1 g/g'},
  {id:'ucx', name:'Urine culture', cat:'Urine', cost:50, min:60, normal:'No growth'},
  // Micro
  {id:'bcx', name:'Blood cultures ×2', cat:'Micro', cost:120, min:10, normal:'Drawn. No growth so far (final in 5 days).'},
  {id:'sputum', name:'Sputum Gram stain and culture', cat:'Micro', cost:70, min:30, normal:'Few PMNs, mixed oropharyngeal flora.'},
  {id:'uag', name:'Urine Legionella and pneumococcal antigens', cat:'Micro', cost:80, min:45, normal:'Both negative'},
  {id:'afb', name:'Sputum AFB smears ×3 + TB NAAT', cat:'Micro', cost:180, min:60, normal:'AFB smears negative. TB NAAT: not detected.'},
  {id:'igra', name:'Interferon-gamma release assay', cat:'Micro', cost:150, min:60, normal:'Negative'},
  {id:'isputum', name:'Induced sputum for Pneumocystis (DFA)', cat:'Micro', cost:200, min:90, normal:'Negative for Pneumocystis'},
  // Imaging
  {id:'cxr', name:'Chest X-ray', cat:'Imaging', cost:120, min:20, normal:'No acute cardiopulmonary process.', img:{type:'cxr', f:[]}},
  {id:'pocus', name:'Bedside ultrasound (lung + heart)', cat:'Imaging', cost:100, min:5, normal:'Lung sliding bilaterally with A-lines. No effusion. Normal LV and RV function. No pericardial effusion.'},
  {id:'ct', name:'CT chest without contrast', cat:'Imaging', cost:550, min:60, normal:'No acute abnormality.', img:{type:'ct', region:'chest', f:[]}},
  {id:'ctpa', name:'CT pulmonary angiogram', cat:'Imaging', cost:850, min:60, normal:'No pulmonary embolism. Lungs clear.', img:{type:'ct', region:'chest', contrast:true, f:[]}},
  {id:'hrct', name:'High-resolution CT chest', cat:'Imaging', cost:650, min:60, normal:'No interstitial lung disease.', img:{type:'ct', region:'chest', f:[]}},
  {id:'cta', name:'CT angiogram of the aorta (chest)', cat:'Imaging', cost:900, min:45, normal:'Normal caliber aorta. No dissection.', img:{type:'ct', region:'chest', contrast:true, f:[]}},
  {id:'ctabd', name:'CT abdomen/pelvis with contrast', cat:'Imaging', cost:700, min:60, normal:'No acute abdominal or pelvic process.', img:{type:'ct', region:'abd', f:[]}},
  {id:'cthead', name:'CT head without contrast', cat:'Imaging', cost:400, min:20, normal:'No hemorrhage, mass, or acute infarct.', img:{type:'ct', region:'head', f:[]}},
  {id:'ctahead', name:'CT angiogram head and neck', cat:'Imaging', cost:800, min:30, normal:'No large-vessel occlusion or significant stenosis.'},
  {id:'mri', name:'MRI brain', cat:'Imaging', cost:1500, min:90, normal:'Normal brain MRI.'},
  {id:'us_ruq', name:'Right upper quadrant ultrasound', cat:'Imaging', cost:250, min:40, normal:'Normal liver and gallbladder. No stones. CBD 4 mm.', img:{type:'us', region:'ruq', f:[]}},
  {id:'us_renal', name:'Renal ultrasound', cat:'Imaging', cost:250, min:40, normal:'Normal-size kidneys. No hydronephrosis or stones.', img:{type:'us', region:'renal', f:[]}},
  {id:'vq', name:'V/Q scan', cat:'Imaging', cost:750, min:120, normal:'Normal perfusion. Very low probability of PE.'},
  {id:'duplex', name:'Lower-extremity venous duplex', cat:'Imaging', cost:350, min:45, normal:'All veins compressible. No DVT.'},
  {id:'tte', name:'Transthoracic echocardiogram', cat:'Imaging', cost:900, min:90, normal:'LVEF 60%. Normal RV size and function. Normal valves. No pericardial effusion.'},
  {id:'skel', name:'Skeletal survey / low-dose whole-body CT', cat:'Imaging', cost:600, min:60, normal:'No lytic or blastic lesions.'},
  // Bedside
  {id:'ecg', name:'12-lead ECG', cat:'Bedside', cost:50, min:5, normal:'', img:{type:'ecg', f:[]}},
  {id:'fsg', name:'Fingerstick glucose', cat:'Bedside', cost:5, min:2, normal:'Glucose 104 mg/dL'},
  {id:'pef', name:'Peak expiratory flow', cat:'Bedside', cost:10, min:2, normal:'PEF 90% of predicted'},
  {id:'nif', name:'NIF and vital capacity', cat:'Bedside', cost:30, min:5, normal:'NIF −75 cm H2O · VC 60 mL/kg'},
  {id:'walk', name:'6-minute walk with oximetry', cat:'Bedside', cost:100, min:20, normal:'Walked 520 m. SpO2 nadir 96%.'},
  {id:'pft', name:'Full PFTs with DLCO', cat:'Bedside', cost:400, min:90, normal:'FEV1/FVC 0.79 · FEV1 96% · TLC 98% · DLCO 94% (normal)'},
  {id:'hsat', name:'Home sleep apnea test', cat:'Bedside', cost:250, min:480, normal:'AHI 3 events/h (normal)'},
  {id:'psg', name:'In-lab polysomnography', cat:'Bedside', cost:1500, min:600, normal:'AHI 2 events/h (normal)'},
  // Procedures
  {id:'lp', name:'Lumbar puncture', cat:'Procedures', cost:500, min:45, invasive:true, normal:'Opening pressure 15 cm H2O. Clear. WBC 2 · Glucose 65 · Protein 35. Gram stain: no organisms.', img:{type:'gram', f:[]}},
  {id:'thora', name:'Diagnostic thoracentesis', cat:'Procedures', cost:600, min:45, invasive:true, normal:'No pleural fluid to sample. Procedure aborted after ultrasound.'},
  {id:'para', name:'Diagnostic paracentesis', cat:'Procedures', cost:400, min:30, invasive:true, normal:'No ascites to sample. Procedure aborted after ultrasound.'},
  {id:'arthro', name:'Arthrocentesis', cat:'Procedures', cost:300, min:30, invasive:true, normal:'Dry tap. No effusion.'},
  {id:'egd', name:'Upper endoscopy (EGD)', cat:'Procedures', cost:2000, min:90, invasive:true, normal:'Normal esophagus, stomach, and duodenum.'},
  {id:'colo', name:'Colonoscopy', cat:'Procedures', cost:2500, min:180, invasive:true, normal:'Normal colonoscopy to the cecum.'},
  {id:'bronch', name:'Bronchoscopy with BAL / biopsy', cat:'Procedures', cost:3500, min:150, invasive:true, normal:'Normal airways. BAL and biopsies nondiagnostic.'},
  {id:'bmbx', name:'Bone marrow biopsy', cat:'Procedures', cost:1500, min:120, invasive:true, normal:'Normocellular marrow with trilineage hematopoiesis.'},
  {id:'renalbx', name:'Renal biopsy', cat:'Procedures', cost:2500, min:120, invasive:true, normal:'Normal glomeruli and tubules.'},
  {id:'tab', name:'Temporal artery biopsy', cat:'Procedures', cost:1200, min:120, invasive:true, normal:'Normal artery. No inflammation.'},
  {id:'rhc', name:'Right heart catheterization', cat:'Procedures', cost:4500, min:180, invasive:true, normal:'mPAP 16 mmHg · PCWP 9 mmHg. Normal hemodynamics.'},
];
const TEST = Object.fromEntries(TESTS.map(t=>[t.id,t]));
const TEST_CATS = ['Labs','Urine','Micro','Imaging','Bedside','Procedures'];

const HISTORY_Q = [
  ['hpi','Tell me what’s been going on. When did it start?', 120],
  ['cp','Any chest pain or palpitations?', 15],
  ['cough','Any cough, sputum, or shortness of breath?', 15],
  ['gi','Any nausea, vomiting, belly pain, or change in stools?', 20],
  ['gu','Any urinary symptoms or change in urine?', 15],
  ['neuro','Any headache, weakness, numbness, or vision changes?', 20],
  ['fever','Fevers, chills, or night sweats?', 10],
  ['wt','Any weight loss or change in appetite?', 10],
  ['pmh','What medical problems do you have?', 30],
  ['meds','What medications do you take?', 30],
  ['etoh','Alcohol, tobacco, or drug use?', 20],
  ['smoke','Have you ever smoked? How much?', 10],
  ['expo','Work, hobbies, or exposures (dust, birds, mold, asbestos)?', 20],
  ['travel','Any travel, immigration, or TB exposure?', 15],
  ['sex','Sexual history and HIV risk?', 30],
  ['immob','Recent surgery, long trips, or leg swelling?', 15],
  ['sleep','How are you sleeping? Snoring?', 20],
  ['ros','Any rashes, joint pain, or eye problems?', 20],
  ['fhx','Anything that runs in the family?', 15],
];
const HIST_DEFAULT = {hpi:'It’s hard to say exactly.', cp:'No chest pain or palpitations.', cough:'No cough or breathing trouble.', gi:'No nausea, vomiting, or belly pain. Stools are normal.', gu:'Nothing unusual with urination.', neuro:'No headache, weakness, numbness, or vision changes.', fever:'No fevers, chills, or sweats.', wt:'My weight’s been steady.', pmh:'Nothing major.', meds:'No regular medications.', etoh:'A drink now and then. No drugs.', smoke:'Never smoked.', expo:'Nothing unusual at work or at home.', travel:'No recent travel. No TB contacts that I know of.', sex:'One long-term partner. No concerns.', immob:'No surgery, no long trips, no leg swelling.', sleep:'I sleep fine.', ros:'No rashes, joint pain, or eye trouble.', fhx:'Nothing I know of.'};

const EXAM_ITEMS = [
  ['general','General appearance','look'],
  ['heent','Head, eyes, mouth','inspect'],
  ['neck','Neck: trachea, veins, nodes, thyroid','inspect and palpate'],
  ['lungR','Right lung','auscultate and percuss'],
  ['lungL','Left lung','auscultate and percuss'],
  ['heart','Heart','auscultate'],
  ['abd','Abdomen','palpate'],
  ['rectal','Rectal exam','digital exam and stool guaiac'],
  ['back','Back and spine','palpate'],
  ['hands','Hands, nails, and pulses','inspect'],
  ['joints','Joints','inspect and palpate'],
  ['legs','Legs and calves','inspect and palpate'],
  ['skin','Skin','inspect'],
  ['neuro','Neurologic exam','mental status, strength, reflexes'],
  ['gait','Gait and station','watch the patient walk'],
  ['gu','Genitourinary exam','external genitalia (chaperoned)'],
];
/* Seconds each exam maneuver takes at the bedside */
const EXAM_SECS = {general:15, heent:45, neck:40, lungR:40, lungL:40, heart:60, abd:60, rectal:120, back:20, hands:20, joints:60, legs:30, skin:45, neuro:240, gait:60, gu:120};
const EXAM_NAME = Object.fromEntries(EXAM_ITEMS.map(e=>[e[0],e[1]]));
const REGION_TIP = {heent:'Examine head, eyes, mouth', neck:'Examine the neck', lungR:'Listen to right lung', lungL:'Listen to left lung', heart:'Listen to heart', abd:'Palpate abdomen', hands:'Inspect hands, nails, pulses', legs:'Examine legs and calves', joints:'Examine joints', gu:'Genitourinary exam', skin:'Inspect skin'};
const EXAM_DEFAULT = {general:'Alert and conversant. No acute distress.', heent:'Moist mucous membranes. Anicteric sclerae. Lips pink. No oral lesions.', neck:'Trachea midline. No JVD. No lymphadenopathy. Thyroid normal.', lungR:'Clear to auscultation. Resonant to percussion.', lungL:'Clear to auscultation. Resonant to percussion.', heart:'Regular rate and rhythm. Normal S1, S2. No murmurs, rubs, or gallops.', abd:'Soft, nontender, nondistended. No organomegaly.', rectal:'Normal tone. Brown stool, guaiac negative.', back:'No spinal or CVA tenderness.', hands:'No clubbing or cyanosis. Symmetric pulses. Capillary refill under 2 s.', joints:'No swelling, warmth, or tenderness.', legs:'No edema. Calves soft, nontender, and symmetric.', skin:'Warm and dry. No rashes.', neuro:'Alert and oriented ×3. Strength 5/5 throughout. Normal sensation and reflexes.', gu:'Normal external genitalia. No lesions, discharge, or masses.'};
const GAIT_DEFAULT = {normal:'Normal gait: steady, normal stride length and arm swing. Tandem walk and Romberg normal.', unable:'Not safe to walk right now. The patient is too unstable or ill to stand.'};

const DX = [
  ['stemi','ST-elevation myocardial infarction','Cardio'],['nstemi','Non-ST-elevation MI','Cardio'],['chf','Acute decompensated heart failure','Cardio'],
  ['afib','Atrial fibrillation with RVR','Cardio'],['aflutter','Atrial flutter','Cardio'],['svt','Supraventricular tachycardia','Cardio'],
  ['dissection','Aortic dissection','Cardio'],['pericarditis','Acute pericarditis','Cardio'],['tamponade','Cardiac tamponade','Cardio'],
  ['aecopd','COPD exacerbation','Pulm'],['asthma','Acute asthma exacerbation','Pulm'],['pe','Pulmonary embolism','Pulm'],
  ['tension','Tension pneumothorax','Pulm'],['ptx','Simple pneumothorax','Pulm'],['hemothorax','Massive hemothorax','Pulm'],
  ['cap','Community-acquired pneumonia','Pulm'],['empyema','Complicated parapneumonic effusion / empyema','Pulm'],['transudate','Transudative pleural effusion','Pulm'],
  ['maligeff','Malignant pleural effusion','Pulm'],['sarcoid','Sarcoidosis','Pulm'],['ipf','Idiopathic pulmonary fibrosis','Pulm'],
  ['hp','Hypersensitivity pneumonitis','Pulm'],['asbestosis','Asbestosis','Pulm'],['sclc','Small cell lung cancer','Pulm'],
  ['sqcc','Squamous cell lung carcinoma','Pulm'],['adeno','Lung adenocarcinoma','Pulm'],['osa','Obstructive sleep apnea','Pulm'],
  ['ohs','Obesity hypoventilation syndrome','Pulm'],['ards','Acute respiratory distress syndrome','Pulm'],['pah','Pulmonary arterial hypertension','Pulm'],
  ['a1at','Alpha-1 antitrypsin deficiency','Pulm'],
  ['pud','Bleeding peptic ulcer','GI'],['varices','Esophageal variceal hemorrhage','GI'],['mallory','Mallory-Weiss tear','GI'],
  ['pancreatitis','Acute pancreatitis','GI'],['cholecystitis','Acute cholecystitis','GI'],['cholangitis','Acute cholangitis','GI'],
  ['sbp','Spontaneous bacterial peritonitis','GI'],['he','Hepatic encephalopathy (no infection)','GI'],['hrs','Hepatorenal syndrome','GI'],
  ['cdiff','C. difficile colitis','GI'],['colonca','Colon adenocarcinoma','GI'],
  ['hyperk','Hyperkalemia from prerenal AKI','Renal'],['atn','Acute tubular necrosis','Renal'],['rhabdo','Rhabdomyolysis with AKI','Renal'],
  ['nephrolith','Uncomplicated kidney stone','Renal'],['psgn','Post-streptococcal glomerulonephritis','Renal'],['nephrotic','Minimal change / nephrotic syndrome','Renal'],
  ['dka','Diabetic ketoacidosis','Endo'],['hhs','Hyperosmolar hyperglycemic state','Endo'],['storm','Thyroid storm','Endo'],
  ['graves','Uncomplicated Graves disease','Endo'],['adrenal','Adrenal crisis (primary adrenal insufficiency)','Endo'],['myxedema','Myxedema coma','Endo'],
  ['hypoglycemia','Hypoglycemia','Endo'],['hyperpth','Primary hyperparathyroidism','Endo'],
  ['ida','Iron deficiency anemia (source not found)','Heme/Onc'],['thal','Thalassemia trait','Heme/Onc'],['ttp','Thrombotic thrombocytopenic purpura','Heme/Onc'],
  ['hus','Hemolytic uremic syndrome','Heme/Onc'],['dic','Disseminated intravascular coagulation','Heme/Onc'],['itp','Immune thrombocytopenia','Heme/Onc'],
  ['hit','Heparin-induced thrombocytopenia','Heme/Onc'],['dvt','Deep vein thrombosis (isolated)','Heme/Onc'],['myeloma','Multiple myeloma','Heme/Onc'],
  ['mgus','MGUS','Heme/Onc'],['chestsyndrome','Acute chest syndrome (sickle cell)','Heme/Onc'],['lymphoma','Lymphoma','Heme/Onc'],
  ['meningitis','Bacterial meningitis','ID'],['viralmen','Viral meningitis','ID'],['endocarditis','Infective endocarditis','ID'],
  ['pjp','Pneumocystis pneumonia with new HIV/AIDS','ID'],['tb','Reactivation tuberculosis','ID'],['urosepsis','Septic shock from obstructed pyelonephritis','ID'],
  ['sepsis','Septic shock (other source)','ID'],
  ['gout','Acute gout','Rheum'],['pseudogout','Pseudogout (CPPD)','Rheum'],['septicarthritis','Septic arthritis','Rheum'],
  ['sle','SLE with lupus nephritis','Rheum'],['ra','Rheumatoid arthritis','Rheum'],['gca','Giant cell arteritis','Rheum'],['pmr','Polymyalgia rheumatica alone','Rheum'],
  ['stroke','Acute ischemic stroke','Neuro'],['tia','Transient ischemic attack','Neuro'],['ich','Intracerebral hemorrhage','Neuro'],
  ['sah','Subarachnoid hemorrhage','Neuro'],['migraine','Migraine','Neuro'],['mgcrisis','Myasthenic crisis','Neuro'],['gbs','Guillain-Barré syndrome','Neuro'],
  ['lems','Lambert-Eaton syndrome','Neuro'],
  ['apap','Acetaminophen overdose','Tox'],['salicylate','Salicylate toxicity','Tox'],['anaphylaxis','Anaphylaxis','Tox'],['panic','Panic attack','Tox'],
];
const DXN = Object.fromEntries(DX.map(d=>[d[0],d[1]]));

const YIELD_LABEL = {key:'Key', useful:'Useful', optional:'Acceptable', low:'Low yield', harmful:'Harmful'};
const KIND_LABEL = {essential:'Essential', good:'Helpful', ok:'Acceptable', wrong:'Not indicated', harmful:'Harmful'};

/* Finding vocabularies for image reads. Every id here is drawn by imaging.js. */
const VOCAB = {
  cxr: [['hyper','Hyperinflation with flattened diaphragms'],['consol_RU','Right upper lobe consolidation'],['consol_RL','Right lower lobe consolidation'],['consol_LL','Left lower lobe consolidation'],
    ['eff_R','Right pleural effusion'],['eff_L','Left pleural effusion'],['eff_bil','Bilateral pleural effusions'],['ptx_R','Right pneumothorax'],['ptx_L','Left pneumothorax'],
    ['shift_L','Mediastinal shift to the left'],['hilar','Bilateral hilar lymphadenopathy'],['retic_low','Basilar reticular opacities'],['retic_mid','Mid-zone reticulonodular opacities'],
    ['cavity_RU','Right upper lobe cavity'],['mass_R','Right hilar mass'],['diffuse','Diffuse bilateral airspace opacities'],['cardiomeg','Cardiomegaly'],
    ['edema','Vascular congestion with Kerley B lines'],['freeair','Free air under the diaphragm'],['widemed','Widened mediastinum'],['ggo_bil','Bilateral perihilar hazy opacities'],
    ['lowvol','Low lung volumes'],['septic','Multiple peripheral nodules']],
  ct_chest: [['pe','Pulmonary artery filling defects'],['dissection','Intimal flap in the aorta'],['honey','Subpleural honeycombing'],['cavity','Thick-walled cavity'],
    ['mass','Central hilar mass'],['consol','Dense consolidation with air bronchograms'],['effusion','Pleural effusion'],['loculated','Loculated pleural collection with enhancing pleura'],
    ['ggo','Ground-glass opacities'],['emphysema','Centrilobular emphysema'],['lad','Mediastinal and hilar lymphadenopathy'],['ptx','Pneumothorax'],
    ['nodules','Multiple peripheral nodules, some cavitating'],['micronod','Perilymphatic micronodules'],['nodule','Solitary pulmonary nodule']],
  ct_abd: [['pancreatitis','Enlarged pancreas with peripancreatic stranding'],['freeair','Free intraperitoneal air'],['ascites','Ascites'],['nodularliver','Small, nodular liver'],
    ['cbd','Dilated common bile duct'],['liverlesions','Multiple hypodense liver lesions'],['hydro','Hydronephrosis'],['perinephric','Perinephric fat stranding'],
    ['colonmass','Colonic mass'],['colitis','Colonic wall thickening'],['splenomeg','Splenomegaly']],
  ct_head: [['ich','Intraparenchymal hemorrhage'],['sah','Subarachnoid hemorrhage'],['infarct','Hypodense territorial infarct'],['mca_dense','Hyperdense MCA sign'],
    ['sdh','Subdural hematoma'],['ring','Ring-enhancing lesions'],['shift','Midline shift'],['vent','Ventricles enlarged out of proportion to sulci']],
  ecg: [['nsr','Normal sinus rhythm'],['stach','Sinus tachycardia'],['sbrady','Sinus bradycardia'],['afib','Atrial fibrillation'],['chb','Third-degree AV block'],
    ['stemi_inf','ST elevation in II, III, aVF'],['recip_lat','Reciprocal ST depression in I and aVL'],['stemi_ant','ST elevation in V1–V4'],['stdep','Lateral ST depression'],
    ['peakedT','Peaked T waves'],['wideQRS','Widened QRS'],['diffuseSTE','Diffuse ST elevation with PR depression'],['lowvolt','Low QRS voltage'],['alternans','Electrical alternans'],
    ['s1q3t3','S1Q3T3 pattern'],['lvh','Left ventricular hypertrophy'],['rad','Right axis deviation'],['ppulm','Peaked P waves (P pulmonale)'],
    ['longQT','Prolonged QT'],['shortQT','Short QT'],['uwave','U waves']],
  smear: [['micro','Microcytic, hypochromic RBCs'],['schisto','Schistocytes'],['lowplt','Few platelets'],['sickle','Sickled cells'],['target','Target cells'],
    ['howell','Howell-Jolly bodies'],['rouleaux','Rouleaux formation'],['spherocyte','Spherocytes'],['macro','Macro-ovalocytes'],['hyperseg','Hypersegmented neutrophil'],['blasts','Blasts with Auer rods']],
  urine: [['rbccast','RBC casts'],['dysRBC','Dysmorphic RBCs'],['wbccast','WBC casts'],['muddy','Muddy brown granular casts'],['wbc','Pyuria (many WBCs)'],['bacteria','Bacteria'],['oval','Oval fat bodies']],
  synovial: [['needle','Needle-shaped, negatively birefringent crystals'],['rhomboid','Rhomboid, positively birefringent crystals'],['pmn','Many neutrophils']],
  gram: [['gpdc','Gram-positive diplococci'],['gndc','Gram-negative diplococci'],['gpc_clusters','Gram-positive cocci in clusters'],['gnr','Gram-negative rods'],
    ['gncb','Gram-negative coccobacilli'],['gpr','Gram-positive rods'],['pmn','Many neutrophils']],
  us_ruq: [['stones','Gallstones with posterior shadowing'],['thickwall','Gallbladder wall thickening'],['cbd','Dilated common bile duct'],['ascites','Ascites']],
  us_renal: [['hydro','Hydronephrosis'],['stone_renal','Renal stone with shadowing']],
};
const VOCAB_NAME = {cxr:'Chest X-ray', ct_chest:'CT chest', ct_abd:'CT abdomen/pelvis', ct_head:'CT head', ecg:'12-lead ECG', smear:'Peripheral smear', urine:'Urine sediment', synovial:'Synovial fluid (polarized)', gram:'Gram stain', us_ruq:'RUQ ultrasound', us_renal:'Renal ultrasound'};

/* ---------- care settings, triage, and outpatient turnaround ---------- */
const CARE = ['ED','Inpatient','Outpatient'];
const ACUITY = [
  ['now','Emergent','Act within minutes: resuscitate, decompress, reperfuse, or start life-saving drugs now.'],
  ['admit','Urgent, admit','Start treatment today and admit to the hospital (ward or step-down).'],
  ['soon','Prompt outpatient','Treat or work up within days, without admission.'],
  ['routine','Routine outpatient','Planned workup and follow-up over weeks.'],
  ['watch','Watchful waiting','Reassure, monitor, or recheck later. No treatment needed now.'],
];
const ACUITY_NAME = Object.fromEntries(ACUITY.map(a=>[a[0],a[1]]));
/* Outpatient result turnaround (minutes) by category, with per-test overrides */
const OUT_DEFAULT = {Labs:1440, Urine:1440, Micro:2880, Imaging:4320, Bedside:null, Procedures:20160};
const OUT_OVERRIDE = {cxr:1440, mri:10080, tte:10080, dexa:7200, pft:10080, hsat:10080, psg:30240, arthro:30, priorct:10, datscan:20160, taptest:20160, ecg:5, fsg:2, pef:2, nif:5, walk:20, bcx:2880};

TESTS.push(
  {id:'resp', name:'Respiratory viral PCR (COVID, flu, RSV)', cat:'Micro', cost:120, min:60, normal:'Negative'},
  {id:'cdiff', name:'C. difficile GDH antigen and toxin', cat:'Micro', cost:90, min:60, normal:'Negative'},
  {id:'stoolcx', name:'Stool culture', cat:'Micro', cost:80, min:120, normal:'No enteric pathogens'},
  {id:'gcnaat', name:'Gonorrhea and chlamydia NAAT', cat:'Micro', cost:100, min:90, normal:'Both negative'},
  {id:'rpr', name:'Syphilis serology (RPR)', cat:'Labs', cost:40, min:60, normal:'Nonreactive'},
  {id:'tpo', name:'Thyroid peroxidase antibodies', cat:'Labs', cost:80, min:60, normal:'Negative'},
  {id:'vitd', name:'25-OH vitamin D', cat:'Labs', cost:70, min:60, normal:'32 ng/mL'},
  {id:'mma', name:'Methylmalonic acid and homocysteine', cat:'Labs', cost:150, min:120, normal:'MMA 0.2 µmol/L · Homocysteine 9 µmol/L (normal)'},
  {id:'ifab', name:'Intrinsic factor antibodies', cat:'Labs', cost:90, min:120, normal:'Negative'},
  {id:'cerulo', name:'Ceruloplasmin', cat:'Labs', cost:60, min:120, normal:'28 mg/dL (normal)'},
  {id:'ucal', name:'24-hour urine calcium', cat:'Urine', cost:80, min:1440, normal:'180 mg/24 h'},
  {id:'priorct', name:'Review the outside CT images', cat:'Imaging', cost:0, min:10, normal:'No abnormality on review.', img:{type:'ct', region:'chest', f:[]}},
  {id:'pet', name:'PET-CT', cat:'Imaging', cost:2500, min:120, normal:'No FDG-avid lesions.'},
  {id:'ccta', name:'Coronary CT angiogram', cat:'Imaging', cost:1100, min:60, normal:'No coronary stenosis. Calcium score 0.'},
  {id:'usthy', name:'Thyroid ultrasound', cat:'Imaging', cost:250, min:40, normal:'Normal thyroid. No nodules.'},
  {id:'hida', name:'HIDA scan', cat:'Imaging', cost:900, min:120, normal:'Normal gallbladder filling.'},
  {id:'mrcp', name:'MRCP', cat:'Imaging', cost:1300, min:90, normal:'Normal biliary tree.'},
  {id:'dexa', name:'DEXA bone density', cat:'Imaging', cost:250, min:30, normal:'T-scores above −1.0 (normal).'},
  {id:'sestamibi', name:'Sestamibi parathyroid scan', cat:'Imaging', cost:900, min:180, normal:'No focal uptake.'},
  {id:'datscan', name:'DaTscan (dopamine transporter SPECT)', cat:'Imaging', cost:3000, min:180, normal:'Normal striatal uptake.'},
  {id:'stress', name:'Exercise stress test', cat:'Bedside', cost:600, min:60, normal:'Negative for ischemia at 10 METs.'},
  {id:'taptest', name:'High-volume lumbar tap test', cat:'Procedures', cost:900, min:180, invasive:true, normal:'Opening pressure 14. No gait change after 30 mL removed.'},
);
TEST_IDX_REFRESH();
function TEST_IDX_REFRESH(){ for(const t of TESTS) TEST[t.id] = t; }

DX.push(
  ['mskcp','Musculoskeletal (costochondral) chest pain','Cardio'],
  ['nodule','Incidental pulmonary nodule (low risk)','Pulm'],['bronchitis','Acute bronchitis','Pulm'],
  ['gallstones','Asymptomatic cholelithiasis','GI'],
  ['subhypo','Subclinical hypothyroidism','Endo'],['hypothyroid','Overt hypothyroidism','Endo'],['fhh','Familial hypocalciuric hypercalcemia','Endo'],
  ['b12','Vitamin B12 deficiency (subacute combined degeneration)','Heme/Onc'],['folate','Folate deficiency','Heme/Onc'],
  ['dgi','Disseminated gonococcal infection','ID'],['reactive','Reactive arthritis','Rheum'],
  ['parkinson','Parkinson disease','Neuro'],['ess','Essential tremor','Neuro'],['nph','Normal pressure hydrocephalus','Neuro'],
  ['alzheimer','Alzheimer disease','Neuro'],['diabneuro','Diabetic peripheral neuropathy','Neuro'],
);
for(const d of DX) DXN[d[0]] = d[1];
