import json
with open('C:/OsaZain_stuff/edu/ACS2906/acs2906-assembly-learning/data/processed/lectures.json', encoding='utf-8') as f:
    data = json.load(f)

# Check unique section IDs per lecture
for lid in [5, 6]:
    lec = [l for l in data['lectures'] if l['id'] == lid][0]
    section_ids = [s['id'] for s in lec['sections']]
    print("L{} section IDs: {}".format(lid, section_ids))
    print("  Unique: {} / {}".format(len(set(section_ids)), len(section_ids)))
    
    # Check concepts and instructions
    print("  Lecture-level concepts: {}".format(lec['concepts']))
    print("  Lecture-level instructions: {}".format(lec['instructions']))
    
    # Check section-level concepts
    for s in lec['sections']:
        print("    Section {} concepts: {}".format(s['id'], s['concepts']))
        print("    Section {} instructions: {}".format(s['id'], s['instructions']))

# Total chars per lecture
for lid in [5, 6]:
    lec = [l for l in data['lectures'] if l['id'] == lid][0]
    total = sum(len(s['content']) for s in lec['sections'])
    print("L{} total content: {} chars (>= 4000 required for VAL-COVERAGE-002)".format(lid, total))
