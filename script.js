document.addEventListener('DOMContentLoaded', async function () {
    const wizard = document.getElementById('wizard');
    const steps = document.querySelectorAll('.step');
    const nextBtn = document.getElementById('nextBtn');
    const backBtn = document.getElementById('backBtn');
    const copyBtn = document.getElementById('copyBtn');
    const useCaseContainer = document.getElementById('useCaseContainer');
    const step1BackBar = document.getElementById('step1BackBar');
    const step1BackBtn = document.getElementById('step1BackBtn');
    const descriptionContainer = document.getElementById('descriptionContainer');
    const detailedOptionsContainer = document.getElementById('detailedOptionsContainer');
    const descriptionDetailContainer = document.getElementById('descriptionDetailContainer');
    const resultContainer = document.getElementById('result');
    const apiSearch = document.getElementById('apiSearch');
    const searchResults = document.getElementById('searchResults');
    const navHint = document.getElementById('navHint');
    const progressSteps = document.querySelectorAll('.progress-step');
    const langButtons = document.querySelectorAll('.lang-btn');
    const pageTitle = document.getElementById('pageTitle');

    let currentLang = 'de';
    let ui = {};
    let apiData = {};
    let categoryGroups = {};
    let categoryHints = {};
    let productContexts = {};
    let searchIndex = [];
    let apiDataMeta = null;

    let currentStep = 0;
    let step1Phase = 'group';
    let selectedGroup = '';
    let selectedUseCase = '';
    let selectedDetail = '';


    // GOLD is DAT's pre-production/test environment. Detect it from the page's own
    // hostname so the wizard needs no manual per-deployment configuration, and
    // rewrite the PROD WSDL host (baked into apiDatameta.json's contextWsdlOverrides/
    // contextEndpoints and the productContexts baseUrls below) to its GOLD equivalent.
    // Confirmed pair: https://www.datgroup.com/... (PROD) <-> https://gold.datgroup.com/... (GOLD)
    const IS_GOLD_ENVIRONMENT = window.location.hostname.includes('gold.dat.de');

    function applyEnvironmentHost(url) {
        if (!IS_GOLD_ENVIRONMENT || !url) return url;
        return url.replace('www.datgroup.com', 'gold.datgroup.com');
    }
    const WORKSHOP_LINK = 'https://www.dat.de/schnittstellenpartnerschaft/workshop/';
    // Same-domain page (dat.de / gold.dat.de) as the wizard itself, so a relative
    // path resolves correctly on GOLD and PROD without any environment detection.
    const SUPPORT_ANFRAGE_LINK = '/customer-area/silverdat-schnittstellen/support-anfrage/';
    const DOCS_FALLBACK_LINK = '/support/interface-documentation';

    const categoryGroupStructure = {
        auth: { icon: 'fa-key', categories: ['auth'] },
        vehicle: { icon: 'fa-car', categories: ['vehicleSelection', 'vehicleIdentification', 'vehicleImagery', 'equipment'] },
        evaluate: { icon: 'fa-file-invoice-dollar', categories: ['evaluate'] },
        calculate: { icon: 'fa-calculator', categories: ['calculation', 'myclaim'] },
        tools: { icon: 'fa-toolbox', categories: ['conversionFunctions', 'masterdata'] }
    };

    const productContextsMeta = {
        myClaim: { baseUrl: 'https://www.datgroup.com/myClaim/soap/v2/', variant: null, group: 'primary' },
        VehicleRepairOnline: { baseUrl: 'https://www.datgroup.com/VehicleRepairOnline/services/', variant: 'calculateExpert', group: 'primary' },
        DATECodeSelection: { baseUrl: 'https://www.datgroup.com/DATECodeSelection/services/', group: 'other' },
        FinanceLine: { baseUrl: 'https://www.datgroup.com/FinanceLine/soap/', group: 'other' },
        valuateNG: { baseUrl: 'https://www.datgroup.com/valuateNG/soap/', group: 'other' },
        MyClaimExternal: { baseUrl: 'https://www.datgroup.com/myClaim/soap/v2/', serviceSuffix: 'MyClaimExternalService', group: 'other' },
        GlassRep: { baseUrl: 'https://www.datgroup.com/GlassRep/services/', group: 'other' },
        Mietwagenspiegel: { baseUrl: 'https://www.datgroup.com/rentalPrices/soap/', group: 'other' }
    };

    function getInitialLang() {
        const param = new URLSearchParams(location.search).get('lang');
        if (param === 'en' || param === 'de') return param;
        const stored = localStorage.getItem('apiFinderLang');
        if (stored === 'en' || stored === 'de') return stored;
        const htmlLang = document.documentElement.lang?.slice(0, 2);
        if (htmlLang === 'en') return 'en';
        return 'de';
    }

    function mergeApiData(meta, text) {
        const merged = {};
        for (const catKey in meta) {
            const catMeta = meta[catKey];
            const catText = text[catKey] || {};
            merged[catKey] = {
                ...catMeta,
                label: catText.label || catKey,
                description: catText.description || '',
                options: {}
            };
            for (const optKey in catMeta.options) {
                const optMeta = catMeta.options[optKey];
                const optText = catText.options?.[optKey] || {};
                merged[catKey].options[optKey] = {
                    ...optMeta,
                    text: optText.text || optKey,
                    description: optText.description || ''
                };
            }
        }
        return merged;
    }

    function applyTranslations(t) {
        ui = t.ui;
        categoryHints = t.categoryHints;
        apiData = mergeApiData(apiDataMeta, t.apiText);
        categoryGroups = {};
        for (const key in categoryGroupStructure) {
            categoryGroups[key] = {
                ...categoryGroupStructure[key],
                label: t.groups[key].label,
                hint: t.groups[key].hint
            };
        }
        productContexts = {};
        for (const key in productContextsMeta) {
            productContexts[key] = {
                ...productContextsMeta[key],
                label: t.products[key].label
            };
        }
        searchIndex = buildSearchIndex();
    }

    async function loadLanguage(lang) {
        let translations = window.API_FINDER_DATA?.i18n?.[lang];
        if (!translations) {
            const response = await fetch(`i18n/${lang}.json`);
            if (!response.ok) throw new Error('Language file not found: ' + lang);
            translations = await response.json();
        }
        applyTranslations(translations);
        currentLang = lang;
        localStorage.setItem('apiFinderLang', lang);
        document.documentElement.lang = lang;
        langButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
            btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang));
        });
        updateStaticTexts();
    }

    function updateStaticTexts() {
        document.title = ui.pageTitle;
        document.getElementById('pageTitle').textContent = ui.pageTitle;
        document.getElementById('pageSubtitle').textContent = ui.pageSubtitle;
        document.getElementById('searchLabel').innerHTML = '<i class="fas fa-search"></i> ' + ui.searchLabel;
        apiSearch.placeholder = ui.searchPlaceholder;
        document.getElementById('searchHint').textContent = ui.searchHint;
        document.getElementById('step2Title').textContent = ui.step2;
        document.getElementById('stepResultTitle').textContent = ui.stepResultTitle;
        step1BackBtn.innerHTML = '<i class="fas fa-arrow-left"></i> ' + ui.backAllAreas;
        backBtn.textContent = ui.back;
        copyBtn.textContent = ui.copyResult;
        document.getElementById('footerSupportLabel').textContent = ui.footerSupport;
        progressSteps.forEach((el, i) => {
            const labelEl = el.querySelector('.step-label');
            const labels = [ui.stepCategory, ui.stepFunction, ui.stepResult];
            if (labelEl) labelEl.textContent = labels[i];
        });
        updateStep1UI();
        updateWizard();
    }

    function refreshView() {
        if (currentStep === 0) populateStep1();
        else if (currentStep === 1) populateStep2();
        else if (currentStep === 2 && selectedUseCase && selectedDetail) showResult();
        updateWizard();
    }

    async function setLanguage(lang) {
        if (lang === currentLang) return;
        await loadLanguage(lang);
        refreshView();
    }

    function renderResultHelp() {
        return `
            <div class="result-help">
                <div class="result-help-item">
                    <i class="fas fa-graduation-cap" aria-hidden="true"></i>
                    <div>
                        <strong>${ui.helpWorkshopTitle}</strong>
                        <p>${ui.helpWorkshopText}
                            <a href="${WORKSHOP_LINK}" target="_blank" rel="noopener">${ui.helpWorkshopLink}</a></p>
                    </div>
                </div>
                <div class="result-help-item">
                    <i class="fas fa-headset" aria-hidden="true"></i>
                    <div>
                        <strong>${ui.helpSupportTitle}</strong>
                        <p>${ui.helpSupportText}
                            <a href="${SUPPORT_ANFRAGE_LINK}">${ui.helpSupportLink}</a></p>
                    </div>
                </div>
            </div>
        `;
    }

    function stripHtml(text) {
        return text.replace(/<[^>]+>/g, '').trim();
    }

    function getSummary(text, maxLength = 140) {
        const plain = stripHtml(text);
        const firstPara = (plain.split('\n\n')[0] || plain).replace(/\s+/g, ' ');
        if (firstPara.length <= maxLength) return firstPara;
        const cut = firstPara.slice(0, maxLength);
        const lastSpace = cut.lastIndexOf(' ');
        return cut.slice(0, lastSpace > 80 ? lastSpace : maxLength) + '…';
    }

    function renderDescription(container, text, placeholder) {
        if (!text) {
            container.innerHTML = `<span style="color: #a0aec0;">${placeholder}</span>`;
            return;
        }
        container.innerHTML = `<div class="description-content">${text}</div>`;
    }

    // After picking a tile, the description and the Next button often sit below the
    // fold, so the click appears to do nothing. Bring the feedback into view.
    function revealSelectionFeedback(container) {
        if (!container) return;
        const rect = container.getBoundingClientRect();
        if (rect.top >= 0 && rect.bottom <= window.innerHeight) return;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        container.scrollIntoView({
            behavior: reduceMotion ? 'auto' : 'smooth',
            block: 'center'
        });
    }

    function copyField(text, btn) {
        navigator.clipboard.writeText(text).then(() => {
            const original = btn.innerHTML;
            btn.classList.add('copied');
            btn.innerHTML = `<i class="fas fa-check"></i> ${ui.copiedShort}`;
            setTimeout(() => {
                btn.classList.remove('copied');
                btn.innerHTML = original;
            }, 2000);
        });
    }

    function createOption(key, data, hint) {
        const option = document.createElement('div');
        option.className = 'icon-option';
        option.dataset.key = key;
        option.setAttribute('role', 'button');
        option.setAttribute('tabindex', '0');
        option.setAttribute('aria-label', data.text || data.label);
        const hintHtml = hint ? `<small class="option-hint">${hint}</small>` : '';
        option.innerHTML = `<i class="fas ${data.icon}"></i><span>${data.text || data.label}</span>${hintHtml}`;
        option.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                option.click();
            }
        });
        return option;
    }

    function buildSearchIndex() {
        const index = [];
        for (const useCaseKey in apiData) {
            const useCase = apiData[useCaseKey];
            for (const detailKey in useCase.options) {
                const option = useCase.options[detailKey];
                index.push({
                    useCaseKey,
                    detailKey,
                    category: useCase.label,
                    title: option.text,
                    service: option.service || '',
                    func: option.func || '',
                    searchText: [
                        useCase.label,
                        option.text,
                        option.service,
                        option.func,
                        stripHtml(option.description)
                    ].join(' ').toLowerCase()
                });
            }
        }
        return index;
    }

    // searchIndex built in applyTranslations

    function hideSearchResults() {
        searchResults.hidden = true;
        searchResults.innerHTML = '';
    }

    function findGroupForCategory(useCaseKey) {
        for (const groupKey in categoryGroups) {
            if (categoryGroups[groupKey].categories.includes(useCaseKey)) return groupKey;
        }
        return '';
    }

    function renderProductLabel(key) {
        const ctx = productContexts[key];
        return `<div class="product-label-short">${ctx.label}</div>`;
    }

    function renderContextPill(key, isSelected) {
        const ctx = productContexts[key];
        return `
            <button type="button" class="context-pill${isSelected ? ' selected' : ''}" data-context="${key}" title="${ctx.label}">
                <span class="pill-short">${ctx.label}</span>
            </button>
        `;
    }

    function updateStep1UI() {
        const title = document.getElementById('step1Title');
        if (step1Phase === 'group') {
            title.textContent = ui.step1Group;
            step1BackBar.hidden = true;
            useCaseContainer.className = 'options-container options-container--groups';
        } else {
            title.textContent = ui.step1Category;
            step1BackBar.hidden = false;
            useCaseContainer.className = 'options-container';
        }
    }

    function enterCategoryPhase(groupKey) {
        selectedGroup = groupKey;
        step1Phase = 'category';
        const group = categoryGroups[groupKey];
        if (group.categories.length === 1) {
            const onlyCategory = group.categories[0];
            const optionKeys = Object.keys(apiData[onlyCategory].options);
            // One category AND one function (e.g. Authentication → generateToken):
            // every intermediate click would be a screen with a single option.
            // Jump straight to the result.
            if (optionKeys.length === 1) {
                selectedUseCase = onlyCategory;
                selectedDetail = optionKeys[0];
                currentStep = 2;
                updateWizard();
                showResult();
                return;
            }
            // One category, several functions: skip only the category screen.
            selectedUseCase = onlyCategory;
            selectedDetail = '';
            renderDescription(descriptionContainer, apiData[selectedUseCase].description, '');
            populateStep1();
            populateStep2();
            currentStep = 1;
            updateWizard();
            return;
        }
        selectedUseCase = '';
        descriptionContainer.innerHTML = '';
        populateStep1();
        updateWizard();
    }

    function goToGroupPhase() {
        step1Phase = 'group';
        selectedGroup = '';
        selectedUseCase = '';
        descriptionContainer.innerHTML = '';
        populateStep1();
        updateWizard();
    }

    function resetWizard() {
        currentStep = 0;
        step1Phase = 'group';
        selectedGroup = '';
        selectedUseCase = '';
        selectedDetail = '';
        apiSearch.value = '';
        hideSearchResults();
        descriptionContainer.innerHTML = '';
        descriptionDetailContainer.innerHTML = '';
        document.querySelectorAll('.icon-option').forEach(opt => opt.classList.remove('selected'));
        populateStep1();
        updateWizard();
        wizard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function jumpToResult(useCaseKey, detailKey) {
        selectedGroup = findGroupForCategory(useCaseKey);
        step1Phase = 'category';
        selectedUseCase = useCaseKey;
        selectedDetail = detailKey;
        apiSearch.value = '';
        hideSearchResults();
        document.querySelectorAll('.icon-option').forEach(opt => opt.classList.remove('selected'));
        populateStep1();
        populateStep2();
        const catOption = useCaseContainer.querySelector(`[data-key="${useCaseKey}"]`);
        const detailOption = detailedOptionsContainer.querySelector(`[data-key="${detailKey}"]`);
        if (catOption) catOption.classList.add('selected');
        if (detailOption) detailOption.classList.add('selected');
        renderDescription(descriptionContainer, apiData[useCaseKey].description, '');
        renderDescription(descriptionDetailContainer, apiData[useCaseKey].options[detailKey].description, '');
        showResult();
        currentStep = 2;
        updateWizard();
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function renderSearchResults(query) {
        const q = query.trim().toLowerCase();
        if (q.length < 2) {
            hideSearchResults();
            return;
        }
        const matches = searchIndex.filter(item => item.searchText.includes(q)).slice(0, 8);
        if (!matches.length) {
            searchResults.innerHTML = `<div class="search-no-results">${ui.searchNoResults}</div>`;
            searchResults.hidden = false;
            return;
        }
        searchResults.innerHTML = matches.map(item => `
            <button type="button" class="search-result-item" data-use-case="${item.useCaseKey}" data-detail="${item.detailKey}">
                <div class="result-path">${item.category}</div>
                <div class="result-title">${item.title}</div>
                <div class="result-match">${item.func.split(', ')[0]}</div>
            </button>
        `).join('');
        searchResults.hidden = false;
        searchResults.querySelectorAll('.search-result-item').forEach(btn => {
            btn.addEventListener('click', () => {
                jumpToResult(btn.dataset.useCase, btn.dataset.detail);
            });
        });
    }
    
    function populateStep1() {
        updateStep1UI();
        useCaseContainer.innerHTML = '';

        if (step1Phase === 'group') {
            for (const key in categoryGroups) {
                const group = categoryGroups[key];
                const option = createOption(key, { label: group.label, icon: group.icon }, group.hint);
                option.classList.add('group-option');
                option.addEventListener('click', () => enterCategoryPhase(key));
                useCaseContainer.appendChild(option);
            }
            return;
        }

        const group = categoryGroups[selectedGroup];
        if (!group) return;

        for (const key of group.categories) {
            if (!apiData[key]) continue;
            const option = createOption(key, apiData[key], categoryHints[key]);
            if (key === selectedUseCase) option.classList.add('selected');
            option.addEventListener('click', () => {
                selectedUseCase = key;
                document.querySelectorAll('#useCaseContainer .icon-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                renderDescription(descriptionContainer, apiData[key].description, '');
                // Categories with a single function have nothing to choose in step 2 —
                // skip straight to the result instead of forcing a pointless click.
                const optionKeys = Object.keys(apiData[key].options || {});
                if (optionKeys.length === 1) {
                    jumpToResult(key, optionKeys[0]);
                    return;
                }
                updateWizard();
                revealSelectionFeedback(descriptionContainer);
            });
            useCaseContainer.appendChild(option);
        }
    }
    
    function populateStep2() {
        detailedOptionsContainer.innerHTML = '';
        descriptionDetailContainer.innerHTML = '';
        const useCaseData = apiData[selectedUseCase];
        if (useCaseData && useCaseData.options) {
            for (const key in useCaseData.options) {
                const optionData = useCaseData.options[key];
                const option = createOption(key, optionData, getSummary(optionData.description, 60));
                detailedOptionsContainer.appendChild(option);
                option.addEventListener('click', () => {
                    selectedDetail = key;
                    document.querySelectorAll('#detailedOptionsContainer .icon-option').forEach(opt => opt.classList.remove('selected'));
                    option.classList.add('selected');
                    renderDescription(descriptionDetailContainer, optionData.description, '');
                    updateWizard();
                    revealSelectionFeedback(descriptionDetailContainer);
                });
            }
        }
    }
    
    function showResult() {
        if (!(selectedUseCase && selectedDetail && apiData[selectedUseCase] && apiData[selectedUseCase].options[selectedDetail])) {
            resultContainer.innerHTML = `<div class="result-card" style="text-align: center; padding: 40px;"><p style="color: #e53e3e; font-size: 1.1rem;">${ui.invalidSelection}</p></div>`;
            return;
        }
        const result = apiData[selectedUseCase].options[selectedDetail];

        // Only the products this function actually exists in.
        const validContexts = (result.availableContexts && result.availableContexts.length)
            ? result.availableContexts
            : (result.productContext ? [result.productContext] : []);

        // Standalone REST functions have no product context at all (productContext:
        // null, no availableContexts) — e.g. a single cross-product REST endpoint.
        // Render a simplified single-row result instead of the product table, using
        // the function's own `endpoint` field directly.
        if (validContexts.length === 0) {
            const restLabel = ui.labelRestEndpoint || 'API-Endpunkt (REST)';
            const funcs = result.func ? result.func.split(/\s*\/\s*|\s*,\s*/).map(f => f.trim()).filter(Boolean) : [];
            const funcChips = funcs.map(f => `<code>${f}</code>`).join('');
            const endpointRow = result.endpoint
                ? `
                    <div class="result-wsdl-table-wrap">
                        <table class="result-wsdl-table single">
                            <thead><tr><th class="col-product">${restLabel}</th></tr></thead>
                            <tbody>
                                <tr>
                                    <td class="col-wsdl">
                                        <div class="wsdl-cell">
                                            <code class="wsdl-code">${result.endpoint}</code>
                                            <div class="wsdl-actions">
                                                <button type="button" class="copy-field-btn" data-copy="${result.endpoint}"><i class="fas fa-copy"></i> ${ui.copy}</button>
                                                <a href="${result.endpoint}" target="_blank" class="wsdl-open-btn"><i class="fas fa-arrow-up-right-from-square"></i> ${ui.open || 'Öffnen'}</a>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>`
                : '';

            let standaloneHtml = `
                <div class="result-card">
                    <div class="result-title">
                        <i class="fas ${result.icon || 'fa-cogs'}"></i>
                        ${result.text}
                    </div>
                    <div class="result-description">${result.description}</div>
                    ${funcChips ? `
                        <div class="result-funcs-shared">
                            <div class="result-funcs-label">${ui.labelRelevantFuncs || (ui.tableFunction || 'API-Funktion(en)')}</div>
                            <div class="func-cell func-cell-wide">${funcChips}</div>
                        </div>` : ''}
                    ${endpointRow}
                    <div class="result-doc-row">
                        <i class="fas fa-book"></i>
                        <a href="${result.kompendium_link || result.api_docs || DOCS_FALLBACK_LINK}" target="_blank">${ui.openDocumentation}</a>
                    </div>
            `;
            standaloneHtml += renderResultHelp();
            standaloneHtml += `</div>`;
            resultContainer.innerHTML = standaloneHtml;

            resultContainer.querySelectorAll('.copy-field-btn').forEach(btn => {
                btn.addEventListener('click', () => copyField(btn.dataset.copy, btn));
            });
            return;
        }

        // Per product: which function name(s) apply there. If the data carries
        // contextFuncs (function names differ per product, e.g. createDossierN
        // vs createValuationN), use them; otherwise the same list applies to all.
        const splitFuncs = (s) => s.split(/\s*\/\s*|\s*,\s*/).map(f => f.trim()).filter(Boolean);
        const funcsForContext = (ctx) => {
            if (result.contextFuncs && result.contextFuncs[ctx]) {
                return splitFuncs(result.contextFuncs[ctx]);
            }
            return splitFuncs(result.func);
        };

        const rest = isRestResult(result);
        const openLabel = rest ? (ui.open || 'Öffnen') : ui.openWsdl;
        const wsdlColHead = rest ? (ui.tableEndpoint || 'Endpunkt') : 'WSDL';

        // Default to SilverDAT 3 PRO (myClaim) when this function offers it — most
        // customers use SilverDAT 3 — otherwise fall back to the first product.
        const defaultContext = validContexts.includes('myClaim') ? 'myClaim' : validContexts[0];
        const orderedContexts = [defaultContext, ...validContexts.filter(c => c !== defaultContext)];

        // Do all products expose the exact same function list? If so, we show the
        // functions once above the table and drop the per-row function column —
        // no more repeating 15 identical function names for every product.
        const funcSignature = (ctx) => funcsForContext(ctx).join('|');
        const uniformFuncs = orderedContexts.every(c => funcSignature(c) === funcSignature(orderedContexts[0]));

        const funcChipsHtml = (funcs) => funcs.map(f => `<code>${f}</code>`).join('');

        const buildRow = (ctx, isExtra) => {
            const url = applyEnvironmentHost(resolveWsdl(result, ctx));
            const variantHint = productContexts[ctx].variant
                ? `<div class="wsdl-variant-hint"><i class="fas fa-circle-info"></i> ${ui.variantHint.replace('{variant}', productContexts[ctx].variant)}</div>`
                : '';
            const funcCol = uniformFuncs ? '' : `<td class="col-funcs"><div class="func-cell">${funcChipsHtml(funcsForContext(ctx))}</div></td>`;
            return `
                <tr${isExtra ? ' class="extra-product-row" hidden' : ''}>
                    <td class="col-product">${productContexts[ctx].label}</td>
                    ${funcCol}
                    <td class="col-wsdl">
                        <div class="wsdl-cell">
                            <code class="wsdl-code">${url}</code>
                            <div class="wsdl-actions">
                                <button type="button" class="copy-field-btn" data-copy="${url}"><i class="fas fa-copy"></i> ${ui.copy}</button>
                                <a href="${url}" target="_blank" class="wsdl-open-btn"><i class="fas fa-arrow-up-right-from-square"></i> ${openLabel}</a>
                            </div>
                            ${variantHint}
                        </div>
                    </td>
                </tr>
            `;
        };

        const rows = orderedContexts.map((ctx, i) => buildRow(ctx, i > 0)).join('');
        const colCount = uniformFuncs ? 2 : 3;
        const extraCount = orderedContexts.length - 1;
        const toggleRow = extraCount > 0
            ? `<tr class="show-more-row"><td colspan="${colCount}"><button type="button" class="show-more-products"><i class="fas fa-chevron-down"></i> ${ui.showMoreProducts.replace('{n}', extraCount)}</button></td></tr>`
            : '';

        const singleProduct = validContexts.length === 1;

        // Shared function block, shown once when every product has the same list.
        const sharedFuncsHtml = uniformFuncs
            ? `
                <div class="result-funcs-shared">
                    <div class="result-funcs-label">${ui.labelRelevantFuncs || (ui.tableFunction || 'API-Funktion(en)')}</div>
                    <div class="func-cell func-cell-wide">${funcChipsHtml(funcsForContext(defaultContext))}</div>
                </div>`
            : '';

        let html = `
            <div class="result-card">
                <div class="result-title">
                    <i class="fas ${result.icon || 'fa-cogs'}"></i>
                    ${result.text}
                </div>
                <div class="result-description">${result.description}</div>
                ${sharedFuncsHtml}

                <div class="result-wsdl-table-wrap">
                    <table class="result-wsdl-table${singleProduct ? ' single' : ''}">
                        <thead>
                            <tr>
                                <th class="col-product">${ui.tableProduct || 'Produkt'}</th>
                                ${uniformFuncs ? '' : `<th class="col-funcs">${ui.tableFunction || 'API-Funktion(en)'}</th>`}
                                <th class="col-wsdl">${wsdlColHead}</th>
                            </tr>
                        </thead>
                        <tbody>${rows}${toggleRow}</tbody>
                    </table>
                </div>

                <div class="result-doc-row">
                    <i class="fas fa-book"></i>
                    <a href="${result.kompendium_link || result.api_docs || DOCS_FALLBACK_LINK}" target="_blank">${ui.openDocumentation}</a>
                </div>
        `;
        html += renderResultHelp();
        html += `</div>`;
        resultContainer.innerHTML = html;

        resultContainer.querySelectorAll('.copy-field-btn').forEach(btn => {
            btn.addEventListener('click', () => copyField(btn.dataset.copy, btn));
        });

        const showMoreBtn = resultContainer.querySelector('.show-more-products');
        if (showMoreBtn) {
            showMoreBtn.addEventListener('click', () => {
                resultContainer.querySelectorAll('.extra-product-row').forEach(row => { row.hidden = false; });
                showMoreBtn.closest('.show-more-row').remove();
            });
        }
    }
    
    // Resolves the correct WSDL URL for a given function + product context.
    // Priority: explicit per-function override > context's fixed serviceSuffix
    // > the function's own service name (first segment before " / " or space).
    function isRestResult(result) {
        return !!(result.contextEndpoints);
    }

    function resolveWsdl(result, contextKey) {
        // REST functions whose endpoint path differs per product (e.g. webScan:
        // /myClaim/rest/marketData/ vs /FinanceLine/rest/v1/marketData/).
        const endpoints = result.contextEndpoints || {};
        if (endpoints[contextKey]) return endpoints[contextKey];

        // Highest priority: an exact, verified WSDL URL for this (function, product)
        // pair. Needed because some products expose services under a different
        // path than their default baseUrl (e.g. myClaim ValuationVehiclePropertiesService
        // lives under /myClaim/soap/, while ValuationServiceN lives under /myClaim/soap/v2/).
        const wsdlOverrides = result.contextWsdlOverrides || {};
        if (wsdlOverrides[contextKey]) return wsdlOverrides[contextKey];

        const ctx = productContexts[contextKey];
        const overrides = result.contextServiceOverrides || {};
        let serviceName = overrides[contextKey] || ctx.serviceSuffix;
        if (!serviceName) {
            serviceName = result.service.split(' / ')[0].trim();
            if (serviceName.includes(' ')) serviceName = serviceName.split(' ')[0];
        }
        return `${ctx.baseUrl}${serviceName}?wsdl`;
    }

    function copyResult() {
        const resultText = resultContainer.innerText;
        navigator.clipboard.writeText(resultText).then(() => {
            copyBtn.innerHTML = `<i class="fas fa-check"></i> ${ui.copied}`;
            setTimeout(() => {
                copyBtn.textContent = ui.copyResult;
            }, 2000);
        });
    }
    
    function updateNavHint() {
        if (currentStep === 0 && step1Phase === 'group') {
            navHint.textContent = ui.navHintGroup;
        } else if (currentStep === 0 && !selectedUseCase) {
            navHint.textContent = ui.navHintCategory;
        } else if (currentStep === 1 && !selectedDetail) {
            navHint.textContent = ui.navHintFunction;
        } else {
            navHint.textContent = '';
        }
    }

    function updateDescriptionVisibility() {
        descriptionContainer.classList.toggle('is-hidden', !(currentStep === 0 && selectedUseCase));
        descriptionDetailContainer.classList.toggle('is-hidden', !(currentStep === 1 && selectedDetail));
    }

    function updateWizard() {
        steps.forEach((step, index) => {
            step.classList.toggle('active', index === currentStep);
        });
        progressSteps.forEach((stepEl, index) => {
            stepEl.classList.toggle('active', index === currentStep);
            stepEl.classList.toggle('completed', index < currentStep);
        });
        backBtn.disabled = currentStep === 0 && step1Phase === 'group';
        copyBtn.style.display = currentStep === 2 ? 'block' : 'none';
        if (currentStep === 2) {
            nextBtn.textContent = ui.restart;
            nextBtn.disabled = false;
            nextBtn.classList.add('is-restart');
        } else {
            nextBtn.textContent = ui.next;
            nextBtn.disabled = currentStep === 0 ? !selectedUseCase : !selectedDetail;
            nextBtn.classList.remove('is-restart');
        }
        updateNavHint();
        updateDescriptionVisibility();
    }
    
    nextBtn.addEventListener('click', () => {
        if (currentStep === steps.length - 1) {
            currentStep = 0;
            step1Phase = 'group';
            selectedGroup = '';
            selectedUseCase = '';
            selectedDetail = '';
            document.querySelectorAll('.icon-option').forEach(opt => opt.classList.remove('selected'));
            descriptionContainer.innerHTML = '';
            descriptionDetailContainer.innerHTML = '';
            resultContainer.innerHTML = '';
            populateStep1();
        } else if (currentStep === 0 && selectedUseCase) {
            const optionKeys = Object.keys(apiData[selectedUseCase].options || {});
            if (optionKeys.length === 1) {
                jumpToResult(selectedUseCase, optionKeys[0]);
                return;
            }
            populateStep2();
            currentStep++;
        } else if (currentStep === 1 && selectedDetail) {
            showResult();
            currentStep++;
        }
        updateWizard();
    });
    
    backBtn.addEventListener('click', () => {
        if (currentStep === 0 && step1Phase === 'category') {
            goToGroupPhase();
            return;
        }
        // Mirror the double-skip: single-category + single-function groups jump
        // straight to the result, so Back from there returns to the group list.
        if (currentStep === 2 && selectedGroup && categoryGroups[selectedGroup]
            && categoryGroups[selectedGroup].categories.length === 1
            && Object.keys(apiData[categoryGroups[selectedGroup].categories[0]].options).length === 1) {
            currentStep = 0;
            selectedDetail = '';
            goToGroupPhase();
            return;
        }
        // Mirror the forward-skip: if this group has only one category, the
        // category screen was never shown, so don't drop the user onto it.
        if (currentStep === 1 && selectedGroup && categoryGroups[selectedGroup]
            && categoryGroups[selectedGroup].categories.length === 1) {
            currentStep = 0;
            selectedDetail = '';
            descriptionDetailContainer.innerHTML = '';
            document.querySelectorAll('#detailedOptionsContainer .icon-option').forEach(opt => opt.classList.remove('selected'));
            goToGroupPhase();
            return;
        }
        // Mirror the single-option forward-skip: step 2 was never shown for
        // categories with only one function, so Back goes to the category list.
        if (currentStep === 2 && selectedUseCase && apiData[selectedUseCase]
            && Object.keys(apiData[selectedUseCase].options || {}).length === 1) {
            currentStep = 0;
            selectedDetail = '';
            descriptionDetailContainer.innerHTML = '';
            document.querySelectorAll('#detailedOptionsContainer .icon-option').forEach(opt => opt.classList.remove('selected'));
            updateWizard();
            return;
        }
        if (currentStep > 0) {
            currentStep--;
            if (currentStep === 1) {
                selectedDetail = '';
                descriptionDetailContainer.innerHTML = '';
                document.querySelectorAll('#detailedOptionsContainer .icon-option').forEach(opt => opt.classList.remove('selected'));
            } else if (currentStep === 0) {
                selectedUseCase = '';
                descriptionContainer.innerHTML = '';
                document.querySelectorAll('#useCaseContainer .icon-option').forEach(opt => opt.classList.remove('selected'));
                populateStep1();
            }
            updateWizard();
        }
    });

    step1BackBtn.addEventListener('click', goToGroupPhase);
    pageTitle.addEventListener('click', resetWizard);
    pageTitle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            resetWizard();
        }
    });
    
    copyBtn.addEventListener('click', copyResult);

    apiSearch.addEventListener('input', (e) => renderSearchResults(e.target.value));
    apiSearch.addEventListener('focus', (e) => {
        if (e.target.value.trim().length >= 2) renderSearchResults(e.target.value);
    });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-wrapper')) hideSearchResults();
    });
    apiSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideSearchResults();
    });
    langButtons.forEach(btn => {
        btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
    });

    try {
        apiDataMeta = window.API_FINDER_DATA?.meta;
        if (!apiDataMeta) {
            const metaResponse = await fetch('apiData.meta.json');
            if (!metaResponse.ok) throw new Error('API metadata not found');
            apiDataMeta = await metaResponse.json();
        }
        await loadLanguage(getInitialLang());
    } catch (err) {
        console.error('DAT API Finder init failed:', err);
        useCaseContainer.innerHTML = '<p style="color:#e53e3e;padding:20px;text-align:center;">DAT API Finder konnte nicht geladen werden. Bitte Seite neu laden oder data.js prüfen.</p>';
        return;
    }

    populateStep1();
    updateWizard();

});