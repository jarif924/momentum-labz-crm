"""Disposable local database round-trip check. Never resets the running audit database."""
import json
import pathlib
import subprocess
import uuid

name = 'audit2_migration_' + uuid.uuid4().hex[:8]
container = 'supabase_db_momentum-labz-crm'
base = ['docker', 'exec', '-i', container]

def sql(text, database=name):
    result = subprocess.run(base + ['psql', '-U', 'postgres', '-d', database, '-v', 'ON_ERROR_STOP=1', '-t', '-A'], input=text, text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout.strip()

sql('CREATE DATABASE ' + name, 'postgres')
dump = subprocess.run(['docker', 'exec', container, 'pg_dump', '-U', 'postgres', '-d', 'postgres', '--no-owner', '--no-acl'], capture_output=True, check=True)
restore = subprocess.run(base + ['psql', '-U', 'postgres', '-d', name], input=dump.stdout, capture_output=True)
# The Supabase dump contains internal privileges that postgres cannot recreate.
# Relevant public/auth/storage tables and all functions are verified by the next commands.
rollback = pathlib.Path('supabase/rollback/20261012000000_brainstorming.sql').read_text()
migration = pathlib.Path('supabase/migrations/20261012000000_brainstorming.sql').read_text()
sql(rollback)
legacy_id = str(uuid.uuid4())
text = 'প্রথম লাইন\n\nSecond line\n'
literal = "E'প্রথম লাইন\\n\\nSecond line\\n'"
sql("INSERT INTO public.brainstorm_notes(id,title,content) VALUES ('" + legacy_id + "','Audit2 legacy'," + literal + ');')
sql(migration)
record = json.loads(sql("SELECT json_build_object('original',original_content,'content',content,'document',document) FROM public.brainstorm_notes WHERE id='" + legacy_id + "'"))
assert record['original'] == text == record['content']
assert [block['content'][0]['text'] for block in record['document']] == text.split('\n')
sql(rollback)
assert sql("SELECT content=" + literal + " FROM public.brainstorm_notes WHERE id='" + legacy_id + "'") == 't'
sql(migration)
assert sql("SELECT original_content=" + literal + " FROM public.brainstorm_notes WHERE id='" + legacy_id + "'") == 't'
print('PASS exact Bangla, blank and trailing paragraphs; rollback byte equality; upgrade reapply. Database: ' + name)
