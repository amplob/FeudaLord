const tradeConfig = {
    baseAmount: 10
};

const tradeOptions = {
    gold: {
        icon: '💰',
        label: 'I need Gold',
        trades: [
            { id: 'sellHarvest',   from: 'food',     icon: '🌾', name: 'Sell Harvest',     rate: 0.4 },
            { id: 'sellLabor',     from: 'manpower', icon: '👥', name: 'Sell Labor',       rate: 3.0 },
            { id: 'taxTheLoyal',   from: 'favor',    icon: '👑', name: 'Tax the Loyal',    rate: 1.5 }
        ]
    },
    food: {
        icon: '🌾',
        label: 'I need Food',
        trades: [
            { id: 'buyProvisions',   from: 'gold',     icon: '💰', name: 'Buy Provisions',     rate: 2.0 },
            { id: 'workforceFarming', from: 'manpower', icon: '👥', name: 'Workforce Farming',  rate: 4.0 },
            { id: 'mandatoryDiet',   from: 'favor',    icon: '👑', name: 'Mandatory Diet',     rate: 2.0 }
        ]
    },
    manpower: {
        icon: '👥',
        label: 'I need Manpower',
        trades: [
            { id: 'hireWorkers',     from: 'gold',  icon: '💰', name: 'Hire Workers',      rate: 0.4 },
            { id: 'attractSettlers', from: 'food',  icon: '🌾', name: 'Attract Settlers',  rate: 0.3 },
            { id: 'conscription',    from: 'favor', icon: '👑', name: 'Conscription',      rate: 0.5 }
        ]
    },
    favor: {
        icon: '👑',
        label: 'I need Favor',
        trades: [
            { id: 'royalGift',      from: 'gold',     icon: '💰', name: 'Royal Gift',       rate: 0.5 },
            { id: 'feedPeople',     from: 'food',     icon: '🌾', name: 'Feed the People',  rate: 0.8 },
            { id: 'humanSacrifice', from: 'manpower', icon: '👥', name: 'Human Sacrifice',  rate: 2.0 }
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
            const toAmount = Math.round(tradeConfig.baseAmount * trade.rate);
            const row = document.createElement("div");
            row.className = "trade-row";
            row.innerHTML = `
                <div class="info">
                    <span class="name">${trade.name}</span>
                    <span class="rate">${tradeConfig.baseAmount}${trade.icon} → ${toAmount}${data.icon}</span>
                </div>
                <button data-trade="${trade.id}" data-from="${trade.from}" data-to="${targetResource}" data-rate="${trade.rate}">Trade</button>
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
