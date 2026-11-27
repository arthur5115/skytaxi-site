# Builds all three 形象版 pages (v2). Old single-file version kept as build_brand_v1.py.
import brand_www, brand_park, brand_ride
for n, m in [('www', brand_www), ('park', brand_park), ('ride', brand_ride)]:
    print(n, m.build())
