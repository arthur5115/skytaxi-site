/* Keep links saved from the earlier single-page version useful. */
const previousPages = {
  "#home": "/",
  "#vision": "/vision/",
  "#ecosystems": "/ecosystems/",
  "#stations": "/stations/",
  "#journey": "/journeys/",
  "#partners": "/partners/",
  "#t1": "/stations/t1/",
  "#t1-care": "/stations/t1/medical-access/",
  "#t2": "/stations/t2/",
  "#t3": "/stations/t3/",
  "#t4": "/stations/t4/",
  "#r90": "/journeys/lakeside-90/",
  "#r3d": "/journeys/lakeside-retreat/",
  "#rforest": "/journeys/forest-half-day/",
  "#service-clinic": "/ecosystems/longevity-clinic/",
  "#service-wellness": "/ecosystems/wellness-centre/",
  "#service-retail": "/ecosystems/curated-retail/",
  "#service-medical": "/ecosystems/medical-allied/",
  "#service-dining": "/ecosystems/healthy-dining/",
  "#service-beauty": "/ecosystems/beauty-care/",
};

if (location.pathname === "/" && Object.hasOwn(previousPages, location.hash)) {
  const nextPage = previousPages[location.hash];
  if (nextPage !== "/") location.replace(nextPage);
}
