import json
import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.config import settings
from app.services.chroma_service import chroma_service

def load_json(file_path: Path):
    if not file_path.exists():
        print(f"[WARN] File not found: {file_path}")
        return None
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

def ingest_all_datasets():
    """
    Repeatable Document Ingestion Pipeline for RuralCred:
      1. Reads approved local datasets (market-data, population-data, schemes,
         equipment-data, infrastructure-data, compliance-data, discovery-data, financial-literacy-data).
      2. Normalizes into rich contextual chunks.
      3. Embeds and stores into ChromaDB vector store with metadata.
    """
    data_dir = settings.DATA_DIR
    print(f"Ingesting datasets from: {data_dir.resolve()}")

    documents = []
    metadatas = []
    ids = []

    # 1. Ingest Market Category Benchmarks
    market_file = data_dir / "market-data.json"
    market_data = load_json(market_file)
    if market_data and "categories" in market_data:
        for cat_key, cat_val in market_data["categories"].items():
            doc_id = f"cat_{cat_key}"
            costs_str = ", ".join([f"{c['item']}: {c['percentageOfOpex']}%" for c in cat_val.get("typicalCosts", [])])
            risks_str = "; ".join(cat_val.get("keyRisks", []))
            actions_str = "; ".join(cat_val.get("recommendedActions", []))
            mandi_trends = cat_val.get("mandiPriceTrends", {})
            mandi_str = "; ".join([f"{k}: {v}" for k, v in mandi_trends.items()]) if mandi_trends else "Standard rural seasonal cycles"

            content = f"""
Category: {cat_val.get('name')} (Key: {cat_key})
Benchmark Project Cost: Typical ₹{cat_val.get('benchmarkProjectCost', {}).get('typical', 0):,}, Min ₹{cat_val.get('benchmarkProjectCost', {}).get('min', 0):,}, Max ₹{cat_val.get('benchmarkProjectCost', {}).get('max', 0):,}
Expected Profit Margin: {cat_val.get('marginRange')}
Average Daily Production/Volume: {cat_val.get('averageDailyVolume')}
Pricing Benchmarks: {json.dumps(cat_val.get('pricingBenchmarks', {}), ensure_ascii=False)}
Demand Seasonality: {cat_val.get('demandSeasonality')}
Hyper-Local Mandi Price Trends & Seasonality: {mandi_str}
Local Competitor Density: {cat_val.get('competitorDensity')}
Typical Operational Costs (OPEX): {costs_str}
Locality Operating Risks: {risks_str}
Prudent Action Steps: {actions_str}
""".strip()

            documents.append(content)
            metadatas.append({
                "type": "market_benchmark",
                "category": cat_key,
                "name": cat_val.get("name", cat_key),
                "margin": cat_val.get("marginRange", ""),
            })
            ids.append(doc_id)

    # 2. Ingest District Population & Mandi Demographics
    pop_file = data_dir / "population-data.json"
    pop_data = load_json(pop_file)
    if pop_data and "districts" in pop_data:
        for dist_key, dist_val in pop_data["districts"].items():
            doc_id = f"dist_{dist_key}"
            crops_str = ", ".join(dist_val.get("majorCrops", []))
            hubs_str = ", ".join(dist_val.get("commercialHubs", []))

            content = f"""
District: {dist_val.get('name')} (Key: {dist_key})
State: {dist_val.get('state')}
Total Rural Households: {dist_val.get('totalRuralHouseholds'):,}
Average Village Population: {dist_val.get('averageVillagePopulation'):,}
Major Crops & Agriculture Base: {crops_str}
Dairy / Rural Cooperative Presence: {dist_val.get('dairyCooperativePresence')}
Average Monthly Rural Household Income: ₹{dist_val.get('averageMonthlyRuralIncome', 0):,}
Commercial Centers & Mandi Hubs: {hubs_str}
Banking & Credit Access: {dist_val.get('bankingOutlets')}
""".strip()

            documents.append(content)
            metadatas.append({
                "type": "district_demographics",
                "district": dist_key,
                "name": dist_val.get("name", dist_key),
                "state": dist_val.get("state", ""),
            })
            ids.append(doc_id)

    # 3. Ingest Government Schemes
    scheme_file = data_dir / "schemes.json"
    scheme_data = load_json(scheme_file)
    if scheme_data and "schemes" in scheme_data:
        for scheme in scheme_data["schemes"]:
            doc_id = f"scheme_{scheme.get('id')}"
            content = f"""
Scheme Name: {scheme.get('name')}
Agency: {scheme.get('agency')}
Max Project Outlay: ₹{scheme.get('maxProjectCost', 0):,}
Statutory Subsidized Interest Rate: {scheme.get('interestRate')}% per annum
Tenure: {scheme.get('tenureYears')} Years
Moratorium Grace Period: {scheme.get('moratoriumMonths')} Months
Repayment Frequency: {scheme.get('repaymentFrequency')}
Eligibility Criteria: {scheme.get('eligibility')}
Security / Guarantee Requirements: {scheme.get('security')}
Scheme Overview: {scheme.get('description')}
""".strip()

            documents.append(content)
            metadatas.append({
                "type": "government_scheme",
                "scheme_id": scheme.get("id"),
                "name": scheme.get("name"),
                "rate": float(scheme.get("interestRate", 0)),
            })
            ids.append(doc_id)

    # 4. Ingest Equipment & Bill of Materials (BOM)
    equip_file = data_dir / "equipment-data.json"
    equip_data = load_json(equip_file)
    if equip_data and "equipment_catalogs" in equip_data:
        for cat_eq in equip_data["equipment_catalogs"]:
            doc_id = cat_eq.get("id")
            ess_str = "\n".join([
                f"- {e['name']} ({e['approxCostRange']}): {e['purpose']} [Specs: {e['specifications']}, Maint: {e['maintenance']}]"
                for e in cat_eq.get("essentialEquipment", [])
            ])
            opt_str = "\n".join([
                f"- {e['name']} ({e['approxCostRange']}): {e['purpose']} [Specs: {e['specifications']}, Maint: {e['maintenance']}]"
                for e in cat_eq.get("optionalUpgrades", [])
            ]) if cat_eq.get("optionalUpgrades") else "None specified"

            content = f"""
Equipment & Machinery Catalog: {cat_eq.get('businessName')} (Category: {cat_eq.get('category')})
Essential Equipment (Bill of Materials):
{ess_str}

Optional / Modernization Upgrades:
{opt_str}
""".strip()

            documents.append(content)
            metadatas.append({
                "type": "equipment_catalog",
                "category": cat_eq.get("category"),
                "name": cat_eq.get("businessName"),
            })
            ids.append(doc_id)

    # 5. Ingest Shed & Civil Infrastructure Guidelines
    infra_file = data_dir / "infrastructure-data.json"
    infra_data = load_json(infra_file)
    if infra_data and "infrastructure_guidelines" in infra_data:
        for infra in infra_data["infrastructure_guidelines"]:
            doc_id = infra.get("id")
            content = f"""
Shed & Civil Infrastructure Guidelines: {infra.get('businessName')} (Category: {infra.get('category')})
Space & Layout Requirements: {infra.get('spaceRequirements')}
Layout & Shed Orientation: {infra.get('layoutAndOrientation')}
Flooring, Slope & Drainage: {infra.get('flooringAndDrainage')}
Roofing, Eaves Height & Ventilation: {infra.get('roofingAndHeight')}
Natural Lighting & Air Quality: {infra.get('ventilationAndLighting', 'Adequate cross ventilation and daylight')}
Water Supply & Biosecurity: {infra.get('waterAndBiosecurity', 'Clean potable water access')}
Approximate Construction Cost: {infra.get('approxCostRange')}
""".strip()

            documents.append(content)
            metadatas.append({
                "type": "infrastructure_guide",
                "category": infra.get("category"),
                "name": infra.get("businessName"),
            })
            ids.append(doc_id)

    # 6. Ingest Licensing & Statutory Compliance Guides
    comp_file = data_dir / "compliance-data.json"
    comp_data = load_json(comp_file)
    if comp_data and "compliance_guides" in comp_data:
        for comp in comp_data["compliance_guides"]:
            doc_id = comp.get("id")
            tiers_str = json.dumps(comp.get("tiersAndThresholds", comp.get("exemptionThresholds", [])), ensure_ascii=False, indent=2)
            docs_str = ", ".join(comp.get("requiredDocuments", comp.get("requirements", [])))

            content = f"""
Statutory Licensing & Compliance Guide: {comp.get('topic')}
Regulatory Authority: {comp.get('regulatoryBody')}
Applicable Rural Enterprises: {comp.get('applicableEnterprises', 'Rural micro and small enterprises')}
Tiers, Thresholds & Fee Structure:
{tiers_str}
Required Verification Documents: {docs_str}
Processing Timeline & Steps: {comp.get('process', comp.get('timeline', 'Self-declaration / Online portal submission'))}
Advisory Note: {comp.get('legalNote', 'General regulatory guidance for small enterprises.')}
""".strip()

            documents.append(content)
            metadatas.append({
                "type": "compliance_guide",
                "topic": comp.get("topic"),
                "name": comp.get("topic"),
            })
            ids.append(doc_id)

    # 7. Ingest Budget to Business Discovery Matrix
    disc_file = data_dir / "discovery-data.json"
    disc_data = load_json(disc_file)
    if disc_data and "budget_discovery_matrix" in disc_data:
        for disc in disc_data["budget_discovery_matrix"]:
            doc_id = disc.get("id")
            biz_lines = []
            for b in disc.get("suitableBusinesses", []):
                biz_lines.append(
                    f"• {b['trade']} (Category: {b['category']}): Investment {b['minBudget']}, Equipment: {b['keyEquipment']}, Working Capital: {b['workingCapital']}, Scale: {b['scale']}, Expected Monthly Net Profit: {b['expectedMonthlyProfit']}, Recommended Credit Scheme: {b['targetScheme']}"
                )
            biz_str = "\n".join(biz_lines)

            content = f"""
Business Discovery by Investment Budget: {disc.get('capitalTier')} (Range: {disc.get('investmentRange')})
Viable Rural Micro Enterprises:
{biz_str}
""".strip()

            documents.append(content)
            metadatas.append({
                "type": "discovery_matrix",
                "tier": disc.get("capitalTier"),
                "name": disc.get("capitalTier"),
            })
            ids.append(doc_id)

    # 8. Ingest Financial Literacy & Rural Insurance
    fin_file = data_dir / "financial-literacy-data.json"
    fin_data = load_json(fin_file)
    if fin_data and "financial_literacy_modules" in fin_data:
        for fin in fin_data["financial_literacy_modules"]:
            doc_id = fin.get("id")
            if "products" in fin:
                prod_str = json.dumps(fin.get("products", []), ensure_ascii=False, indent=2)
                content = f"""
Banking & Savings Literacy Guide: {fin.get('topic')} (Domain: {fin.get('domain')})
Regulatory Body: {fin.get('regulatoryAgency')}
Available Deposit & Savings Products:
{prod_str}
Deposit Safety Guarantee: {fin.get('depositSafetyGuarantee')}
""".strip()
            else:
                content = f"""
Rural Micro-Insurance Reference Guide: {fin.get('topic')} (Domain: {fin.get('domain')})
Regulatory / Sponsoring Agency: {fin.get('regulatoryAgency')}
Risk Coverage Scope: {fin.get('coverageScope')}
Premium Structure & Government Subsidy: {fin.get('premiumAndSubsidy', fin.get('premiumStructure', ''))}
Identification & Claim Settlement Process: {fin.get('identificationMandate', '')} {fin.get('claimProcedure', fin.get('enrollmentAndClaim', ''))}
Important Exclusions: {fin.get('importantExclusions')}
""".strip()

            documents.append(content)
            metadatas.append({
                "type": "financial_literacy",
                "domain": fin.get("domain"),
                "topic": fin.get("topic"),
                "name": fin.get("topic"),
            })
            ids.append(doc_id)

    print(f"Total documents prepared for ChromaDB: {len(documents)}")
    chroma_service.add_documents(documents=documents, metadatas=metadatas, ids=ids)
    print(f"Ingestion complete! Total documents now in ChromaDB: {chroma_service.get_count()}")

if __name__ == "__main__":
    ingest_all_datasets()
