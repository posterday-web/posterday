// Posterday map locations.
// The map places each show from its `city` text, so new shows need no extra work
// as long as their town (or venue) is listed below. To pin a show exactly, give
// its record in shows.js its own `lat` and `lng`.
//
// How a show is placed, first match wins:
//   1. `lat` / `lng` on the show itself
//   2. a VENUE whose name appears anywhere in the show's `city` text
//   3. the TOWN that appears last in the `city` text (whole words only, so
//      "Bath" doesn't match "Battersea" and "York Street, Belfast" is Belfast)
// Shows that match nothing are listed under the map as "not on the map yet".
// Run `node tools/check-places.js` to see which those are.
//
// Coordinates are [latitude, longitude], to about 100 m.

window.VENUES = [
  // London
  ["Business Design Centre", 51.5365, -0.1056],
  ["New Inn Yard", 51.5251, -0.0790],
  ["Truman Brewery", 51.5210, -0.0717],
  ["Michael Sterling Building", 51.5326, -0.4729],
  ["Knights Park", 51.4053, -0.3005],
  ["20 East Road", 51.5287, -0.0880],
  ["Granary Square", 51.5354, -0.1253],
  ["John Islip Street", 51.4910, -0.1281],
  ["Peckham Road", 51.4741, -0.0805],
  ["Merton Hall Road", 51.4155, -0.2130],
  ["Elephant and Castle", 51.4946, -0.1011],
  ["Carpenter's Road", 51.5410, -0.0115],
  ["Hester Road", 51.4815, -0.1690],
  ["Kensington Gore", 51.5013, -0.1790],
  ["White City", 51.5145, -0.2265],
  ["South Kensington Campus", 51.4988, -0.1749],
  ["Portal Way", 51.5225, -0.2635],
  ["Greenwich Peninsula", 51.5017, 0.0055],
  ["Gower Street", 51.5246, -0.1340],
  ["New Cross", 51.4744, -0.0354],
  ["Harrow Campus", 51.5803, -0.3195],
  ["Marylebone Road", 51.5225, -0.1556],
  ["Hendon", 51.5890, -0.2290],
  ["Shoreditch Campus", 51.5150, -0.0700],
  // England outside London
  ["Falkner Road, Farnham", 51.2130, -0.8010],
  ["Ashley Road, Epsom", 51.3310, -0.2650],
  ["New Dover Road, Canterbury", 51.2730, 1.0900],
  ["Brunel Engine Shed", 51.6295, -0.7520],
  ["Grand Parade", 50.8250, -0.1360],
  ["Park Avenue, Winchester", 51.0660, -1.3110],
  ["Ruskin Gallery", 52.2035, 0.1340],
  ["Penryn", 50.1700, -5.1230],
  ["Bower Ashton", 51.4430, -2.6220],
  ["Locksbrook", 51.3880, -2.3920],
  ["Wallisdown", 50.7430, -1.8970],
  ["Tavistock Place, Plymouth", 50.3755, -4.1395],
  ["Design School, Loughborough", 52.7650, -1.2290],
  ["Surface Gallery", 52.9530, -1.1360],
  ["Nottingham Playhouse", 52.9545, -1.1570],
  ["Bonington Gallery", 52.9580, -1.1530],
  ["Delia Derbyshire Building", 52.4070, -1.5040],
  ["Bede Island", 52.6280, -1.1450],
  ["Parkside", 52.4830, -1.8880],
  ["Stoke-on-Trent campus", 53.0090, -2.1750],
  ["College Road Campus, Hereford", 52.0640, -2.7080],
  ["Oxford Road, Manchester", 53.4710, -2.2400],
  ["New Adelphi", 53.4850, -2.2720],
  ["John Lennon Art and Design Building", 53.4010, -2.9670],
  ["Byrom Street", 53.4120, -2.9830],
  ["Blenheim Walk", 53.8100, -1.5560],
  ["University Road, Leeds", 53.8080, -1.5560],
  ["Broadcasting Place", 53.8060, -1.5530],
  ["Lord Mayor's Walk", 53.9645, -1.0790],
  ["City Campus East", 54.9770, -1.6060],
  ["Hatton Gallery", 54.9800, -1.6150],
  // Scotland, Wales, Northern Ireland
  ["Perth Road, Dundee", 56.4570, -2.9840],
  ["Reid & Stow", 55.8660, -4.2640],
  ["Stow Building", 55.8660, -4.2640],
  ["Lauriston Place", 55.9445, -3.1990],
  ["Garthdee", 57.1185, -2.1390],
  ["De La Beche Street", 51.6225, -3.9455],
  ["Llandaff", 51.4960, -3.2130],
  ["York Street, Belfast", 54.6040, -5.9290]
];

// Town and city centres, for any show whose venue isn't listed above.
window.TOWNS = [
  // London and around
  ["London", 51.5074, -0.1278], ["Uxbridge", 51.5463, -0.4786], ["Kingston upon Thames", 51.4123, -0.3007],
  ["Kingston", 51.4123, -0.3007], ["Harrow", 51.5806, -0.3420], ["Stratford", 51.5416, -0.0033],
  ["Greenwich", 51.4826, -0.0077], ["Croydon", 51.3762, -0.0982], ["Wimbledon", 51.4214, -0.2064],
  // South East and East
  ["Farnham", 51.2148, -0.7990], ["Epsom", 51.3360, -0.2670], ["Canterbury", 51.2802, 1.0789],
  ["Rochester", 51.3880, 0.5060], ["Chatham", 51.3800, 0.5270], ["Maidstone", 51.2720, 0.5290],
  ["Margate", 51.3890, 1.3860], ["Folkestone", 51.0814, 1.1695], ["Hastings", 50.8550, 0.5730],
  ["Brighton", 50.8225, -0.1372], ["Chichester", 50.8365, -0.7792], ["Guildford", 51.2362, -0.5704],
  ["Reading", 51.4543, -0.9781], ["Oxford", 51.7520, -1.2577], ["High Wycombe", 51.6286, -0.7482],
  ["Winchester", 51.0632, -1.3080], ["Southampton", 50.9097, -1.4044], ["Portsmouth", 50.8198, -1.0880],
  ["Bournemouth", 50.7192, -1.8808], ["Poole", 50.7150, -1.9872], ["Milton Keynes", 52.0406, -0.7594],
  ["Luton", 51.8787, -0.4200], ["Hatfield", 51.7634, -0.2232], ["Bedford", 52.1360, -0.4667],
  ["Cambridge", 52.2053, 0.1218], ["Norwich", 52.6309, 1.2974], ["Ipswich", 52.0567, 1.1482],
  ["Colchester", 51.8959, 0.8919], ["Chelmsford", 51.7356, 0.4685], ["Southend", 51.5459, 0.7077],
  // South West
  ["Falmouth", 50.1526, -5.0663], ["Truro", 50.2632, -5.0510], ["Plymouth", 50.3755, -4.1427],
  ["Exeter", 50.7184, -3.5339], ["Bristol", 51.4545, -2.5879], ["Bath", 51.3811, -2.3590],
  ["Gloucester", 51.8642, -2.2382], ["Cheltenham", 51.8994, -2.0783], ["Swindon", 51.5558, -1.7797],
  ["Taunton", 51.0150, -3.1060],
  // Midlands
  ["Birmingham", 52.4862, -1.8904], ["Coventry", 52.4068, -1.5197], ["Leicester", 52.6369, -1.1398],
  ["Loughborough", 52.7721, -1.2062], ["Nottingham", 52.9548, -1.1581], ["Derby", 52.9225, -1.4746],
  ["Lincoln", 53.2307, -0.5406], ["Northampton", 52.2405, -0.9027], ["Wolverhampton", 52.5862, -2.1288],
  ["Stoke-on-Trent", 53.0027, -2.1794], ["Worcester", 52.1920, -2.2200], ["Hereford", 52.0565, -2.7160],
  ["Stafford", 52.8070, -2.1170], ["Shrewsbury", 52.7073, -2.7553],
  // North
  ["Manchester", 53.4808, -2.2426], ["Salford", 53.4875, -2.2901], ["Liverpool", 53.4084, -2.9916],
  ["Sheffield", 53.3811, -1.4701], ["Leeds", 53.8008, -1.5491], ["Bradford", 53.7960, -1.7594],
  ["Huddersfield", 53.6458, -1.7850], ["Wakefield", 53.6833, -1.4977], ["York", 53.9600, -1.0873],
  ["Hull", 53.7676, -0.3274], ["Doncaster", 53.5228, -1.1285], ["Preston", 53.7632, -2.7031],
  ["Lancaster", 54.0466, -2.8007], ["Blackpool", 53.8175, -3.0357], ["Bolton", 53.5769, -2.4282],
  ["Chester", 53.1934, -2.8931], ["Newcastle", 54.9783, -1.6178], ["Sunderland", 54.9069, -1.3838],
  ["Durham", 54.7753, -1.5849], ["Middlesbrough", 54.5742, -1.2350], ["Carlisle", 54.8925, -2.9329],
  // Scotland
  ["Glasgow", 55.8642, -4.2518], ["Edinburgh", 55.9533, -3.1883], ["Dundee", 56.4620, -2.9707],
  ["Aberdeen", 57.1497, -2.0943], ["Stirling", 56.1165, -3.9369], ["Inverness", 57.4778, -4.2247],
  ["Perth", 56.3950, -3.4308], ["Paisley", 55.8456, -4.4239], ["Ayr", 55.4586, -4.6292],
  ["Galashiels", 55.6170, -2.8060], ["St Andrews", 56.3398, -2.7967],
  // Wales
  ["Cardiff", 51.4816, -3.1791], ["Swansea", 51.6214, -3.9436], ["Newport", 51.5842, -2.9977],
  ["Carmarthen", 51.8576, -4.3121], ["Aberystwyth", 52.4153, -4.0829], ["Bangor", 53.2274, -4.1293],
  ["Wrexham", 53.0462, -2.9930], ["Caerleon", 51.6100, -2.9560],
  // Northern Ireland
  ["Belfast", 54.5973, -5.9301], ["Derry", 54.9966, -7.3086], ["Londonderry", 54.9966, -7.3086],
  ["Coleraine", 55.1326, -6.6646], ["Newry", 54.1751, -6.3402]
];

// Returns [lat, lng] for a show, or null if it can't be placed.
window.placeShow = function(s){
  if(typeof s.lat === "number" && typeof s.lng === "number") return [s.lat, s.lng];
  const text = String(s.city || "");
  const lower = text.toLowerCase();
  for(const [name, lat, lng] of window.VENUES) if(lower.includes(name.toLowerCase())) return [lat, lng];
  let best = null, bestAt = -1;
  for(const [name, lat, lng] of window.TOWNS){
    const re = new RegExp("(^|[^a-z])" + name.toLowerCase().replace(/[.*+?^${}()|[\]\\-]/g, "\\$&") + "(?![a-z])", "g");
    let m; while((m = re.exec(lower))){ const at = m.index + m[1].length; if(at > bestAt || (at === bestAt && name.length > best.n)){ best = {n:name.length, p:[lat, lng]}; bestAt = at; } }
  }
  return best ? best.p : null;
};
