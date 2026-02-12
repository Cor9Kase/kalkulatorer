Chart.register(ChartDataLabels);

// Globalt objekt for å holde chart-instansene
const charts = {};

// Hjelpefunksjon for å formatere tall
const formatNumber = (num, unit = '') => {
    const formatted = unit === ' Døgn' ? num.toFixed(1) : Math.round(num).toLocaleString('no-NO');
    return formatted + unit;
};

// Funksjon for å rendrere/oppdatere de 3 diagrammene
function renderAllCharts(co2eData, costData, downtimeData) {
    const COLOR_RIVING = '#e5e7eb';
    const COLOR_MTETT = '#9ca3af';
    const COLOR_SAVED = '#059669';

    const configs = [
        {
            id: 'co2eChart',
            unit: ' kg',
            labels: ['Riving', 'M-Tett', 'Spart'],
            data: [co2eData.base, co2eData.mTett, co2eData.saved],
            colors: [COLOR_RIVING, COLOR_MTETT, COLOR_SAVED]
        },
        {
            id: 'costChart',
            unit: ' kr',
            labels: ['Riving', 'M-Tett', 'Spart'],
            data: [costData.base, costData.mTett, costData.saved],
            colors: [COLOR_RIVING, COLOR_MTETT, COLOR_SAVED]
        },
        {
            id: 'downtimeChart',
            unit: ' døgn',
            labels: ['Riving', 'M-Tett', 'Spart'],
            data: [downtimeData.base, downtimeData.mTett, downtimeData.saved],
            colors: [COLOR_RIVING, COLOR_MTETT, COLOR_SAVED]
        }
    ];

    configs.forEach(config => {
        const ctx = document.getElementById(config.id).getContext('2d');
        if (charts[config.id]) charts[config.id].destroy();

        charts[config.id] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: config.labels,
                datasets: [{
                    data: config.data,
                    backgroundColor: config.colors,
                    borderRadius: 8,
                    barPercentage: 0.6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        formatter: (val) => formatNumber(val, config.unit),
                        font: { weight: 'bold', family: "'Inter', sans-serif" }
                    }
                },
                scales: {
                    y: { beginAtZero: true, grid: { display: false }, ticks: { display: false } },
                    x: { grid: { display: false }, ticks: { font: { weight: '600' } } }
                }
            }
        });
    });
}

window.onload = function () {
    // ---- DOM Elements ----
    const areaSlider = document.getElementById('areaSlider');
    const areaDisplay = document.getElementById('areaDisplay');
    const damageGrid = document.getElementById('damageGrid');
    const selectedDamageInput = document.getElementById('selectedDamage');

    const nextBtn = document.getElementById('nextBtn');
    const calculatorCard = document.getElementById('calculatorCard');
    const inputSection = document.getElementById('inputSection');
    const leadFormSection = document.getElementById('leadFormSection');
    const leadForm = document.getElementById('leadForm');
    const resultsSection = document.getElementById('resultsSection');
    const infoFooter = document.getElementById('infoFooter');
    const step1Error = document.getElementById('step1Error');

    // --- Datamodell ---
    const BASE_CASE_LOOKUP = {
        2: { cost: 299000, days: 25 }, 3: { cost: 312000, days: 25 }, 4: { cost: 322000, days: 25 },
        5: { cost: 338000, days: 25 }, 6: { cost: 353000, days: 25 }, 7: { cost: 368000, days: 25 },
        8: { cost: 378000, days: 25 }, 9: { cost: 398000, days: 25 }, 10: { cost: 413000, days: 25 },
        11: { cost: 428000, days: 30 }, 12: { cost: 443000, days: 30 }, 13: { cost: 443000, days: 30 },
        14: { cost: 453000, days: 30 }, 15: { cost: 453000, days: 30 }, 16: { cost: 463000, days: 30 },
        17: { cost: 463000, days: 30 }, 18: { cost: 473000, days: 30 }, 19: { cost: 483000, days: 30 },
        20: { cost: 493000, days: 30 }, 21: { cost: 503000, days: 30 }, 22: { cost: 513000, days: 30 },
        23: { cost: 523000, days: 30 }, 24: { cost: 533000, days: 30 }, 25: { cost: 543000, days: 30 }
    };

    const M_TETT_CASES = [
        { value: 'Slukrep', label: 'Sluk', type: 'fixed', data: { CO2e: 41.847333005119644, COST: 35000, DAYS: 3 } },
        { value: 'Gulv', label: 'Gulv', type: 'scaled', data: { refCO2e: 1627.8694474703302, refCOST: 130000, DAYS: 7 } },
        { value: 'Sisterne', label: 'Sisterne', type: 'fixed', data: { CO2e: 233.74103626466453, COST: 65000, DAYS: 5 } },
        { value: 'Terskel', label: 'Terskel', type: 'fixed', data: { CO2e: 50.451139066157886, COST: 15000, DAYS: 2 } },
        { value: 'Dusjnisje', label: 'Dusjnisje', type: 'fixed', data: { CO2e: 664.2903186439871, COST: 120000, DAYS: 5 } },
        { value: 'Vegg', label: 'Vegg', type: 'fixed', data: { CO2e: 1068.4444000282804, COST: 90000, DAYS: 7 } },
    ];

    const REFERENCE_AREA = 9;

    // --- Actions ---

    areaSlider.addEventListener('input', (e) => {
        areaDisplay.textContent = e.target.value;
    });

    function populateDamageButtons() {
        M_TETT_CASES.forEach(caseItem => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'damage-btn';
            btn.textContent = caseItem.label;

            btn.addEventListener('click', () => {
                document.querySelectorAll('.damage-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedDamageInput.value = caseItem.value;
                step1Error.classList.add('hidden');
            });
            damageGrid.appendChild(btn);
        });
    }
    populateDamageButtons();

    nextBtn.addEventListener('click', () => {
        if (!selectedDamageInput.value) {
            step1Error.classList.remove('hidden');
            return;
        }
        inputSection.classList.add('hidden');
        leadFormSection.classList.remove('hidden');
        leadFormSection.scrollIntoView({ behavior: 'smooth' });
    });

    leadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        calculateSavings();
    });

    function calculateSavings() {
        const A = parseFloat(areaSlider.value);
        const selectedValue = selectedDamageInput.value;
        const caseItem = M_TETT_CASES.find(c => c.value === selectedValue);

        // Base Case
        let lookupArea = Math.round(A);
        const baseLookup = BASE_CASE_LOOKUP[Math.min(25, Math.max(2, lookupArea))];
        const baseCostTotal = baseLookup.cost;
        const baseDowntime = baseLookup.days;
        let baseCO2eTotal = 425.75 + (232.5 * A);

        // M-Tett Case
        let mTettCO2e, mTettCost, mTettTime;
        if (caseItem.type === 'fixed') {
            mTettCO2e = caseItem.data.CO2e;
            mTettCost = caseItem.data.COST;
            mTettTime = caseItem.data.DAYS;
        } else {
            const factor = A / REFERENCE_AREA;
            mTettCO2e = caseItem.data.refCO2e * factor;
            mTettCost = caseItem.data.refCOST * factor;
            mTettTime = caseItem.data.DAYS;
        }

        // Calculation of SAVINGS for the metrics
        const savedCO2 = Math.max(0, baseCO2eTotal - mTettCO2e);
        const savedCost = Math.max(0, baseCostTotal - mTettCost);
        const savedTime = Math.max(0, baseDowntime - mTettTime);

        // Update UI Summary Metrics
        document.getElementById('co2e-summary').textContent = Math.round(savedCO2).toLocaleString('no-NO') + ' kg';
        document.getElementById('cost-summary').textContent = Math.round(savedCost).toLocaleString('no-NO') + ' NOK';
        document.getElementById('downtime-summary').textContent = Math.round(savedTime) + ' Døgn';

        // Update Detailed Results
        document.getElementById('co2e-result').textContent = Math.round(savedCO2).toLocaleString('no-NO') + ' kg';
        document.getElementById('cost-result').textContent = Math.round(savedCost).toLocaleString('no-NO') + ' NOK';
        document.getElementById('downtime-result').textContent = Math.round(savedTime) + ' Døgn';

        // Render the 3 Charts
        renderAllCharts(
            { base: baseCO2eTotal, mTett: mTettCO2e, saved: savedCO2 },
            { base: baseCostTotal, mTett: mTettCost, saved: savedCost },
            { base: baseDowntime, mTett: mTettTime, saved: savedTime }
        );

        // Transition: Hide the entire calculator card and show results
        calculatorCard.classList.add('hidden');
        if (infoFooter) infoFooter.classList.add('hidden');
        resultsSection.classList.remove('hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
};
