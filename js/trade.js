const tradeConfig = {
    baseAmount: 10
};

// Trade rates are derived live from the active kingdom's resource values.
// Manual trade is intentionally harsher than canonical (TRADE_PENALTY=0.5)
// so cards remain the efficient path. Names/icons are static; the rate is
// computed at render time so switching kingdom auto-reprices.
const TRADE_PENALTY = 0.5;

function getTradeRate(from, to) {
    if (typeof getResourceValue !== "function") return 0;
    return TRADE_PENALTY * getResourceValue(from) / getResourceValue(to);
}

const tradeOptions = {
    gold: {
        icon: '💰',
        label: 'I need Gold',
        trades: [
            { id: 'sellHarvest',   from: 'food',     icon: '🌾', name: 'Sell Harvest' },
            { id: 'sellLabor',     from: 'manpower', icon: '👥', name: 'Sell Labor' },
            { id: 'taxTheLoyal',   from: 'favor',    icon: '👑', name: 'Tax the Loyal' }
        ]
    },
    food: {
        icon: '🌾',
        label: 'I need Food',
        trades: [
            { id: 'buyProvisions',    from: 'gold',     icon: '💰', name: 'Buy Provisions' },
            { id: 'workforceFarming', from: 'manpower', icon: '👥', name: 'Workforce Farming' },
            { id: 'mandatoryDiet',    from: 'favor',    icon: '👑', name: 'Mandatory Diet' }
        ]
    },
    manpower: {
        icon: '👥',
        label: 'I need Manpower',
        trades: [
            { id: 'hireWorkers',     from: 'gold',  icon: '💰', name: 'Hire Workers' },
            { id: 'attractSettlers', from: 'food',  icon: '🌾', name: 'Attract Settlers' },
            { id: 'conscription',    from: 'favor', icon: '👑', name: 'Conscription' }
        ]
    },
    favor: {
        icon: '👑',
        label: 'I need Favor',
        trades: [
            { id: 'royalGift',      from: 'gold',     icon: '💰', name: 'Royal Gift' },
            { id: 'feedPeople',     from: 'food',     icon: '🌾', name: 'Feed the People' },
            { id: 'humanSacrifice', from: 'manpower', icon: '👥', name: 'Human Sacrifice' }
        ]
    }
};

const tradeMessages = {
    humanSacrifice: [
        "The volcano god is pleased! 🌋",
        "A small price for divine favor...",
        "They died doing what they loved: being sacrificed."
    ],
    mandatoryDiet: [
        "Fasting builds character! 🙏",
        "The peasants didn't need those calories anyway.",
        "Spiritual enlightenment through hunger!"
    ],
    taxTheLoyal: [
        "They love you so much they WANT to pay!",
        "Loyalty has its price. Literally.",
        "The crown thanks you for your... generosity."
    ],
    conscription: [
        "Volunteering is mandatory today!",
        "Your country needs YOU! (No refunds)",
        "Service brings honor... whether you want it or not."
    ],
    sellLabor: [
        "They'll work hard... for someone else now.",
        "Outsourcing: a medieval classic."
    ],
    workforceFarming: [
        "Many hands make light work!",
        "The fields won't plow themselves."
    ]
};

function getTradeMessage(tradeId) {
    const messages = tradeMessages[tradeId];
    if (!messages || messages.length === 0) return null;
    return messages[Math.floor(Math.random() * messages.length)];
}

let tradeHandler = null;

function initTradeUI(handler) {
    tradeHandler = handler;
    const accordion = document.getElementById("tradeAccordion");
    if (!accordion) return;
    
    accordion.innerHTML = "";
    
    Object.entries(tradeOptions).forEach(([targetResource, data]) => {
        const group = document.createElement("div");
        group.className = "trade-group";
        
        const header = document.createElement("div");
        header.className = "trade-header";
        header.innerHTML = `
            <span>${data.icon} ${data.label}</span>
            <span class="arrow">▶</span>
        `;
        
        const options = document.createElement("div");
        options.className = "trade-options";
        
        data.trades.forEach((trade) => {
            const rate = getTradeRate(trade.from, targetResource);
            const toAmount = tradeConfig.baseAmount * rate;
            const row = document.createElement("div");
            row.className = "trade-row";
            row.innerHTML = `
                <div class="info">
                    <span class="name">${trade.name}</span>
                    <span class="rate">${tradeConfig.baseAmount}${trade.icon} → ${fmtNum(toAmount)}${data.icon}</span>
                </div>
                <button data-trade="${trade.id}" data-from="${trade.from}" data-to="${targetResource}" data-rate="${rate}">Trade</button>
            `;
            options.appendChild(row);
        });
        
        header.addEventListener("click", () => {
            // Close other groups
            accordion.querySelectorAll('.trade-group').forEach(g => {
                if (g !== group) {
                    g.classList.remove('open');
                    g.querySelector('.trade-options').classList.remove('active');
                }
            });
            // Toggle this group
            group.classList.toggle('open');
            options.classList.toggle("active");
        });
        
        options.addEventListener("click", (event) => {
            const button = event.target.closest("button");
            if (!button || !tradeHandler) return;
            
            const { trade, from, to, rate } = button.dataset;
            tradeHandler(trade, from, to, parseFloat(rate));
        });
        
        group.appendChild(header);
        group.appendChild(options);
        accordion.appendChild(group);
    });
}
