// Unsplash photo ids grouped by topic, used for seeded stories (free to use under the Unsplash License).
export const PHOTOS = {
  shipping: ['1578575437130-527eed3abbec', '1518527989017-5baca7a58d3c', '1650900426337-0f7c0e0f86ea'],
  sea: ['1613026113231-ba81a6e4dd01', '1491655275136-b70f977cb5da'],
  rail: ['1604995118751-3f765d45cad9', '1688525138876-652b04859861', '1787847976037-c50c2653c9f6'],
  office: ['1600506451234-9e555c0c8d05', '1615392105814-c9fbad4d25a2'],
  chips: ['1587845323226-bad89242c735'],
  food: ['1681262392875-eab4e1f2e79e', '1739857554154-80c15b7b1af7', '1727099079513-952d40de9d78'],
  airport: ['1787059526580-b8e654ba2d44'],
  markets: ['1560221328-12fe60f83ab8'],
  money: ['1580519542036-c47de6196ba5'],
  ai: ['1677442136019-21780ecad995'],
  phone: ['1550041473-d296a3a8a18a', '1758691031979-6128d4029604'],
  internet: ['1604869515882-4d10fa4b0492'],
  nature: ['1589556183130-530470785fab'],
  city: ['1612698977733-6a35ecd94b5f', '1728494141437-ee81f251d56b'],
  school: ['1509062522246-3755977927d7'],
  sailing: ['1501771924607-209f42a6e7e4'],
  racket: ['1658723826297-fe4d1b1e6600'],
  shophouse: ['1615392105814-c9fbad4d25a2'],
  payments: ['1595079676339-1534801ad6cf'],
  water: ['1650119180676-f840d0afa6dc'],
  energy: ['1508790762848-8a3096277c8f'],
  books: ['1779232665980-25e75e3d853b'],
  cycling: ['1691268464072-d20feb7b382a'],
  football: ['1705593973313-75de7bf95b56'],
  datacentre: ['1584169417032-d34e8d805e8b'],
  diplomacy: ['1633095975779-fd354aa0dc95', '1645705315654-019e91990d4f'],
  space: ['1517976487492-5750f3195933'],
  ev: ['1593941707874-ef25b8b4a92b', '1763543007050-4dac73ffc67f'],
  health: ['1519494026892-80bbd2d6fd0d', '1758691461990-03b49d969495'],
  election: ['1540910419892-4a36d2c3266c'],
  storm: ['1769411972457-e89bb3350ac6', '1508697014387-db70aad34f4d'],
  crypto: ['1518546305927-5a555bb7020d'],
  motorsport: ['1699138346782-8a8b211c3da2', '1571826856387-b633b9ebd93d'],
}

const used = {}
// Rotates through a topic's photos so neighbouring stories don't repeat the same image.
export function photoFor(topic) {
  const list = PHOTOS[topic] || PHOTOS.city
  used[topic] = (used[topic] || 0) + 1
  const id = list[(used[topic] - 1) % list.length]
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&h=1000&q=80`
}
