const fs = require('fs');
const file = 'src/app/(app)/settings/page.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  `      <div className="flex-1">
        {activeTab === 'pipeline' && <PipelineStagesManager />}
        {activeTab === 'services' && <ServicesManager />}
        {activeTab === 'tags' && <TagsManager />}
        {activeTab === 'currency' && <CurrencyManager />}
        {activeTab === 'team' && <TeamManager />}
      </div>`,
  `      <div className="flex-1 overflow-auto pb-12">
        {activeTab === 'pipeline' && <PipelineStagesManager />}
        {activeTab === 'services' && <ServicesManager />}
        {activeTab === 'tags' && <TagsManager />}
        {activeTab === 'currency' && <CurrencyManager />}
        {activeTab === 'team' && <TeamManager />}
        {activeTab === 'custom_fields' && <CustomFieldsManager />}
      </div>`
);

fs.writeFileSync(file, code);
