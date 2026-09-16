const fs = require('fs');
let code = fs.readFileSync('src/app/api/leads/ingest/route.ts', 'utf8');

// Fix 1: catch (err: any) -> catch (err: unknown)
code = code.replace(/catch \(err: any\)/g, "catch (err: unknown)");

// Fix 2: catch (e) {} -> catch (_) {}
code = code.replace(/catch \(e\) \{\}/g, "catch (_) {}");

fs.writeFileSync('src/app/api/leads/ingest/route.ts', code);
