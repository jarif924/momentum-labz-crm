const fs = require('fs');
const file = 'src/app/(app)/settings/page.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  `  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTab = searchParams.get('tab') || 'stages';

  function setTab(tab: string) {
    router.push(\`/settings?tab=\${tab}\`);
  }

  const tabs = [
    { id: 'stages', label: 'Pipeline Stages' },
    { id: 'services', label: 'Services' },
    { id: 'tags', label: 'Tags' },
    { id: 'currency', label: 'Currency Defaults' },
    { id: 'team', label: 'Team Members' },
    { id: 'custom_fields', label: 'Lead Custom Fields' },
  ];`,
  `  const [activeTab, setActiveTab] = useState('pipeline');

  const tabs = [
    { id: 'pipeline', label: 'Pipeline Stages' },
    { id: 'services', label: 'Services' },
    { id: 'tags', label: 'Tags' },
    { id: 'currency', label: 'Currency Defaults' },
    { id: 'team', label: 'Team' },
    { id: 'custom_fields', label: 'Lead Custom Fields' },
  ];`
);

code = code.replace(
`      <div className="flex-1 overflow-auto pb-12">
        {activeTab === 'pipeline' && <PipelineManager />}
        {activeTab === 'services' && <ServicesManager />}
        {activeTab === 'tags' && <TagsManager />}
        {activeTab === 'currency' && <CurrencyManager />}
        {activeTab === 'team' && <TeamManager />}
      </div>`,
`      <div className="flex-1 overflow-auto pb-12">
        {activeTab === 'pipeline' && <PipelineManager />}
        {activeTab === 'services' && <ServicesManager />}
        {activeTab === 'tags' && <TagsManager />}
        {activeTab === 'currency' && <CurrencyManager />}
        {activeTab === 'team' && <TeamManager />}
        {activeTab === 'custom_fields' && <CustomFieldsManager />}
      </div>`
);

fs.writeFileSync(file, code);
