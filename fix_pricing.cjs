const fs = require('fs');

function updatePricing(filePath) {
let code = fs.readFileSync(filePath, 'utf8');

// App.tsx
if(filePath.includes('App.tsx')) {
    const oldMonthly = `{ 
      id: 'monthly', 
      name: 'Premium Måned', 
      price: '129,-', 
      period: '/mnd', 
      stripeUrl: 'https://buy.stripe.com/aFaaEQdmWeoZgla9mA18c01',
      features: [
        'Full tilgang til alle Premium-verktøy', 
        'Opprett grupper i \\'Basen\\'', 
        'Fleksibelt, si opp når du vil'
      ] 
    }`;
    const newMonthly = `{ 
      id: 'monthly', 
      name: 'Premium Måned', 
      price: '129,-', 
      period: '/mnd', 
      stripeUrl: 'https://buy.stripe.com/aFaaEQdmWeoZgla9mA18c01',
      features: [
        'Standard AI (Gemini Flash)', 
        'Overfladisk sensor-tilbakemelding', 
        'Maks 1 gruppe i Basen',
        'Begrenset lagring',
        'Enkel strukturanalyse'
      ] 
    }`;
    
    const oldSemester = `{ 
      id: 'semester', 
      name: 'Semester-pakka', 
      price: '499,-', 
      period: '/ 6 mnd', 
      popular: true,
      mostProfitable: true,
      priorityUpdates: true,
      stripeUrl: 'https://buy.stripe.com/28odQ2eaS2Otaha3cc',
      features: [
        'Alt i Gratis, pluss:', 
        'Opprett egne grupper i \\'Basen\\'',
        'Ubegrenset bruk av Sensor-verktøyet',
        'Prioritert tilgang til nyeste AI-modeller',
        'Du sparer 35% (Kun 83,-/mnd)'
      ] 
    }`;
    
    const newSemester = `{ 
      id: 'semester', 
      name: 'Semester-pakka', 
      price: '499,-', 
      period: '/ 6 mnd', 
      popular: true,
      mostProfitable: true,
      priorityUpdates: true,
      stripeUrl: 'https://buy.stripe.com/28odQ2eaS2Otaha3cc',
      features: [
        'Alt i Premium Måned, pluss:', 
        'Kraftigste AI (Gemini Pro)',
        'Dypgående sensor-analyse',
        'Ubegrenset antall grupper i Basen',
        'Ubegrenset lagring',
        'Full tilgang til dyp plagiat- og KI-sjekk'
      ] 
    }`;

  code = code.replace(oldMonthly, newMonthly);
  code = code.replace(oldSemester, newSemester);
}

fs.writeFileSync(filePath, code);
}

updatePricing('src/App.tsx');
