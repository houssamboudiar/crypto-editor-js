// DOM elements
const entry = document.getElementById('entry');
const results = document.getElementById('output');
const loading = document.getElementById('loading');
const errors = document.getElementById('errors');
const exchange = document.getElementById('exchange');

let initialText = ''; 
// Needed Regex Expressions
let nameMethod = /({{ *)(Name)(\/)([A-Z]{2,})( *}})/g;
let exchangeMethod = /({{ *)(Exchange)(\/)([A-Z]{2,})( *}})/g;
let SymbolRegex = /([A-Z]{2,})/g;

// Method Maps
let coinNames = new Map();
let coinExchange = new Map();

// Fetch all coins from Coinpaprika unfortunately it's a lot of data cause the API cant serve Get by symbol.
// It loads only once to preserve performance.
let fetchCoins = (() => fetch('https://api.coinpaprika.com/v1/coins/')
    .then(response => response.json())
    .then((data) => {
        loading.style.display = 'none';
        entry.disabled = false;
        results.disabled = false;
        errors.innerHTML = ``;
        return data
    })
    .catch((err) => {
        errors.innerHTML = `There has been a problem with fetch operation ${err}`;
    }))();

// Fetch markets of the defined coinId from Coinpaprika API.
let fetchCoinExchangeById = (coinId) => fetch(`https://api.coinpaprika.com/v1/coins/${coinId}/markets`)
    .then(response => {
        if (!response.ok) return Promise.reject(response);
        errors.innerHTML='';
        return response.json()
    })
    .catch((response) => {
        if (response.status == 429) {
            errors.innerHTML='The rate limit has been exceeded. Your data will be loaded after a short period.';
        } else {
            errors.innerHTML=`${response}`;
        }
    });

// Gets ID from Coins data using the symbol we extracted from the string
findIdBySymbol = (coins, symbol) => coins.find(element => element.symbol == symbol)?.id;
// Gets Name from Coins data using the symbol we extracted from the string
findNameBySymbol = (coins, symbol) => coins.find(element => element.symbol == symbol)?.name;
// Finds the price of the mentioned Coin by default Coinbase (Hardcoded) else it loads the first Market available else it returns Not Found.
findPriceById = (markets) => markets?.find(element => element.exchange_id === 'coinbase')?.quotes.USD.price || markets[0]?.quotes.USD.price || 'Not found';

const interpretNameMatches = (initialText) => {
    // Extract each method values on the following arrays
    let nameMatches = initialText.match(nameMethod) ?? [] ;
    // Fill coinNames Map with '{{Name/BTC}} => ['id','name']'
    nameMatches.map((item, i) => {
        // Extracting Symbol from the Regex Matches
        let [Symbol] = item.match(SymbolRegex);
        // Fill coinName Map with '{{Name/BTC}} => ['id','name','exchange']'
        fetchCoins.then(coins => {
            coinNames.set(item, [findIdBySymbol(coins, Symbol), findNameBySymbol(coins, Symbol), null])
        })
    });
}

const interpretExchangeMatches = (initialText) => {
    // Extract each method values on the following arrays
    let exchangeMatches = initialText.match(exchangeMethod) ?? [];
    // Fill coinExchange Map with '{{Exchange/BTC}} => ['id','exchange']'
    exchangeMatches.map((item, i) => {
        // Use fetch coins promise result to find our coin data ...
        fetchCoins.then(coins => {
            // If that coin doesnt exist we create new Map Item.
            !coinExchange.get(item) && coinExchange.set(item, [findIdBySymbol(coins, item.match(SymbolRegex)[0]), findNameBySymbol(coins, item.match(SymbolRegex)[0]), null]);
            // If that coin exists we make sure it's price don't set as Null. (Improves Performance)
            coinExchange.get(item) && coinExchange.get(item)[2] && coinExchange.set(item, [findIdBySymbol(coins, item.match(SymbolRegex)[0]), findNameBySymbol(coins, item.match(SymbolRegex)[0]), coinExchange.get(item)[2]])
        })
    });
}

const handleChange = (event) => {
    // If the event target value is coming from Exchanger Checkbox Ignore it.
    // Handle Entry text for line breaks.
    if(event.target.value != 'on') initialText = event.target.value.replace(/(\r\n|\n|\t)/gm, ' ');
    // Keep updated text for Permutation
    lastUpdate = initialText;
    // Pass text for a method that handles extracting needed Methods and populating Name Map.
    interpretNameMatches(initialText);
    // Pass text for a method that handles extracting needed Methods and populating Exchange Map.
    interpretExchangeMatches(initialText);
    // For each element of the Names map we update Result Textarea Value with our new Interpreted Text 
    coinNames.forEach((value, key) => {
        // Destructuring each item Value array
        let [coinId, coinName] = value;
        // Extracting coin symbol from the string
        let [Symbol] = key?.match(SymbolRegex);
        const regexName = new RegExp(`({{ *)(Name)(\/)${Symbol}( *}})`, 'g');
        results.value = lastUpdate.replace(regexName, `${coinName}`);
        lastUpdate = results.value;
    })
    // For each element of the Exchange map we update Result Textarea Value with our new Interpreted Text 
    coinExchange.forEach((value, key) => {
        // Destructuring each item Value array
        let [coinId, coinName, coinExchangePrice] = value;
        // Fetching Api for coin exchange price only if it's Null. 
        coinId && !coinExchangePrice && fetchCoinExchangeById(coinId).then((data) => {coinExchange.set(key, [coinId, coinName, data&&findPriceById(data)])})
        // Extracting coin symbol from the string
        let [Symbol] = key?.match(SymbolRegex);
        // Adressing the string we want to replace using REGEX
        const regexExchange = new RegExp(`({{ *)(Exchange)(\/)${Symbol}( *}})`, 'g');
        // Updating text result with out fetched value
        results.value = lastUpdate.replace(regexExchange, `${value[2] || 'fetching...'}`);
        // Saving our Text for the next update
        lastUpdate = results.value;
    })
    results.value = lastUpdate
    lastUpdate = results.value;
}

entry.addEventListener('input', handleChange);
entry.addEventListener('keyup', handleChange);

/*
ENTRY TEST 1
In 1998, Wei Dai published a description of "b-money", characterized as an anonymous,
distributed electronic cash system.[Shortly thereafter, Nick Szabo described bit gold. Like {{
Name/BTC }} and other cryptocurrencies that would follow it, bit gold (not to be confused
with the later gold-based exchange, {{ Name/BITGOLD }}) was described as an electronic
currency system which required users to complete a proof of work function with solutions
being cryptographically put together and published. A currency system based on a reusable
proof of work was later created by Hal Finney who followed the work of Dai and Szabo. The
first decentralized cryptocurrency, {{ Name/BTC }}, was created in 2009 by pseudonymous
developer Satoshi Nakamoto. It used SHA-256, a cryptographic hash function, as its
proof-of-work scheme. In April 2011, {{ Name/NMC }} was created as an attempt at forming a
decentralized DNS, which would make internet censorship very difficult. Soon after, in
October 2011, {{ Name/LTC }} was released. It was the first successful cryptocurrency to use
scrypt as its hash function instead of SHA-256. Another notable cryptocurrency, {{
Name/PPC }} was the first to use a proof-of-work/proof-of-stake hybrid
*/

/*
ENTRY TEST 2
In 1996, Wei Dai published a description of "b-money", characterized as an anonymous,
distributed electronic cash system.[Shortly thereafter, Nick Szabo described bit gold. Like {{
Exchange/BTC }} and other cryptocurrencies that would follow it, bit gold (not to be confused
with the later gold-based exchange, {{ Exchange/BITGOLD }}) was described as an electronic
currency system which required users to complete a proof of work function with solutions
being cryptographically put together and published. A currency system based on a reusable
proof of work was later created by Hal Finney who followed the work of Dai and Szabo. The
first decentralized cryptocurrency, {{ Exchange/BTC }}, was created in 2009 by pseudonymous
developer Satoshi Nakamoto. It used SHA-256, a cryptographic hash function, as its
proof-of-work scheme. In April 2011, {{ Exchange/NMC }} was created as an attempt at forming a
decentralized DNS, which would make internet censorship very difficult. Soon after, in
October 2011, {{ Exchange/LTC }} was released. It was the first successful cryptocurrency to use
scrypt as its hash function instead of SHA-256. Another notable cryptocurrency, {{
Exchange/PPC }} was the first to use a proof-of-work/proof-of-stake hybrid
*/

/*
ENTRY TEST 3
In 1998, Wei Dai published a description of "b-money", characterized as an anonymous,
distributed electronic cash system.[Shortly thereafter, Nick Szabo described bit gold. Like {{
Name/BTC }} and other cryptocurrencies that would follow it, bit gold (not to be confused
with the later gold-based exchange, {{ Name/BITGOLD }}) was described as an electronic
currency system which required users to complete a proof of work function with solutions
being cryptographically put together and published. A currency system based on a reusable
proof of work was later created by Hal Finney who followed the work of Dai and Szabo. The
first decentralized cryptocurrency, {{ Name/BTC }}, was created in 2009 by pseudonymous
developer Satoshi Nakamoto. It used SHA-256, a cryptographic hash function, as its
proof-of-work scheme. In April 2011, {{ Name/NMC }} was created as an attempt at forming a
decentralized DNS, which would make internet censorship very difficult. Soon after, in
October 2011, {{ Name/LTC }} was released. It was the first successful cryptocurrency to use
scrypt as its hash function instead of SHA-256. Another notable cryptocurrency, {{
Name/PPC }} was the first to use a proof-of-work/proof-of-stake hybrid
In 1998, Wei Dai published a description of "b-money", characterized as an anonymous,
distributed electronic cash system.[Shortly thereafter, Nick Szabo described bit gold. Like {{
Exchange/BTC }} and other cryptocurrencies that would follow it, bit gold (not to be confused
with the later gold-based exchange, {{ Exchange/BITGOLD }}) was described as an electronic
currency system which required users to complete a proof of work function with solutions
being cryptographically put together and published. A currency system based on a reusable
proof of work was later created by Hal Finney who followed the work of Dai and Szabo. The
first decentralized cryptocurrency, {{ Exchange/BTC }}, was created in 2009 by pseudonymous
developer Satoshi Nakamoto. It used SHA-256, a cryptographic hash function, as its
proof-of-work scheme. In April 2011, {{ Exchange/NMC }} was created as an attempt at forming a
decentralized DNS, which would make internet censorship very difficult. Soon after, in
October 2011, {{ Exchange/LTC }} was released. It was the first successful cryptocurrency to use
scrypt as its hash function instead of SHA-256. Another notable cryptocurrency, {{
Exchange/PPC }} was the first to use a proof-of-work/proof-of-stake hybrid
*/

/*
ENTRY TEST 4
{{ Exchange/BTC }}
{{ Exchange/BT }}
{{ Exchange/ETH }}
{{ Exchange/ET }}
{{ Exchange/HEX }}
{{ Exchange/CRO }}
{{ Exchange/OKB }}
{{ Exchange/VET }}
{{ Exchange/FRAX }}
{{ Exchange/BTCB }}
{{ Exchange/XTZ }}
{{ Exchange/STX }}
{{ Exchange/LRC }}
*/

