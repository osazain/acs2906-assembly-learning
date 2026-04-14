import json

with open('C:/OsaZain_stuff/edu/ACS2906/acs2906-assembly-learning/data/processed/lectures.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for lecture in data['lectures']:
    if lecture['id'] in [5, 6]:
        print(f"\n=== Lecture {lecture['id']}: {lecture['title']} ===")
        total_chars = 0
        for section in lecture['sections']:
            content_len = len(section['content'])
            total_chars += content_len
            min_req = 2500 if lecture['id'] == 5 else 1200
            status = 'OK' if content_len >= min_req else 'FAIL'
            print(f"  Section '{section['title']}': {content_len} chars (min {min_req}: {status})")
        print(f"  TOTAL: {total_chars} chars")
        
        # Check for markdown and assembly syntax
        print("\n  Markdown/Assembly checks:")
        for section in lecture['sections']:
            has_headers = '## ' in section['content'] or '### ' in section['content']
            has_code = '```asm' in section['content'] or '```' in section['content']
            has_logical = 'LOGICAL' in section['content'] or 'AND' in section['content'] or 'OR' in section['content'] or 'XOR' in section['content']
            has_shift = 'SHIFT' in section['content'] or 'SHL' in section['content'] or 'SHR' in section['content']
            has_rotate = 'ROTATE' in section['content'] or 'ROL' in section['content'] or 'ROR' in section['content']
            has_cmp = 'CMP' in section['content']
            has_jmp = 'JMP' in section['content']
            print(f"    '{section['title']}': headers={has_headers}, code={has_code}, logical={has_logical}, shift={has_shift}, rotate={has_rotate}, cmp={has_cmp}, jmp={has_jmp}")
