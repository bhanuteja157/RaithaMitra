# backend/app/services/taxonomy_genomics_service.py
"""
Taxonomy, Literature & Genomics Intelligence (AD-05):
- GBIF Species Matching & Taxonomy Validation
- Enhanced Europe PMC Search (relevance ranking, deduplication, publication classification)
- NCBI E-utilities (Gene, PubMed, Taxonomy)
- Ensembl Plants (Species verification, assembly metadata, gene annotations)
"""
import os
from typing import Any, Dict, List, Optional
from backend.app.schemas.biointel_advanced import (
    GBIFSpeciesMatch,
    NCBIGeneRecord,
    NCBIGeneticEvidence,
    EnsemblPlantGenomics,
)
from backend.app.services.http_client import fetch_json_with_resilience
from backend.app.services.biotech_service import biotech_service

# Verified binomial mapping for common Indian crops + ambiguous name disambiguation
CURATED_TAXONOMY: Dict[str, Dict[str, Any]] = {
    "tomato": {
        "scientific": "Solanum lycopersicum",
        "taxon_key": 2930137,
        "genus": "Solanum",
        "family": "Solanaceae",
        "ensembl": "solanum_lycopersicum",
        "common": ["Tomato", "ಟೊಮ್ಯಾಟೊ", "टमाटर"],
        "synonyms": ["Lycopersicon esculentum"],
    },
    "rice": {
        "scientific": "Oryza sativa",
        "taxon_key": 2703459,
        "genus": "Oryza",
        "family": "Poaceae",
        "ensembl": "oryza_sativa",
        "common": ["Rice", "Paddy", "ಭತ್ತ", "धान"],
        "synonyms": ["Oryza sativa subsp. indica"],
    },
    "maize": {
        "scientific": "Zea mays",
        "taxon_key": 5290052,
        "genus": "Zea",
        "family": "Poaceae",
        "ensembl": "zea_mays",
        "common": ["Maize", "Corn", "ಮೆಕ್ಕೆಜೋಳ", "मक्का"],
        "synonyms": [],
    },
    "chilli": {
        "scientific": "Capsicum annuum",
        "taxon_key": 2932944,
        "genus": "Capsicum",
        "family": "Solanaceae",
        "ensembl": "capsicum_annuum",
        "common": ["Chilli", "Hot Pepper", "ಮೆಣಸಿನಕಾಯಿ", "मिर्च"],
        "synonyms": ["Capsicum frutescens"],
    },
    "banana": {
        "scientific": "Musa acuminata",
        "taxon_key": 2762752,
        "genus": "Musa",
        "family": "Musaceae",
        "ensembl": "musa_acuminata",
        "common": ["Banana", "ಬಾಳೆಹಣ್ಣು", "केला"],
        "synonyms": ["Musa × paradisiaca"],
    },
    "mango": {
        "scientific": "Mangifera indica",
        "taxon_key": 3190638,
        "genus": "Mangifera",
        "family": "Anacardiaceae",
        "ensembl": None,  # Not in core Ensembl Plants assembly list
        "common": ["Mango", "ಮಾವಿನಹಣ್ಣು", "आम"],
        "synonyms": [],
    },
    "wheat": {
        "scientific": "Triticum aestivum",
        "taxon_key": 2706388,
        "genus": "Triticum",
        "family": "Poaceae",
        "ensembl": "triticum_aestivum",
        "common": ["Wheat", "ಗೋಧಿ", "गेहूँ"],
        "synonyms": [],
    },
    "cotton": {
        "scientific": "Gossypium hirsutum",
        "taxon_key": 2877842,
        "genus": "Gossypium",
        "family": "Malvaceae",
        "ensembl": None,
        "common": ["Cotton", "ಹತ್ತಿ", "कपास"],
        "synonyms": ["Gossypium mexicanum"],
    },
}

AMBIGUOUS_CROPS: Dict[str, List[str]] = {
    "pepper": ["Capsicum annuum (Chilli / Bell Pepper)", "Piper nigrum (Black Pepper)"],
    "millet": ["Eleusine coracana (Finger Millet / Ragi)", "Pennisetum glaucum (Pearl Millet / Bajra)"],
    "gram": ["Cicer arietinum (Bengal Gram / Chickpea)", "Vigna mungo (Black Gram)"],
}

# Candidate resistance/tolerance gene symbols per species for NCBI / Ensembl lookup
SPECIES_GENE_SYMBOLS: Dict[str, List[str]] = {
    "Solanum lycopersicum": ["Ty-2", "Mi-1.2", "Pto", "Sw-5", "DREB1A"],
    "Oryza sativa": ["Xa21", "Sub1A", "DRO1", "Pi-ta"],
    "Capsicum annuum": ["Bs2", "L4"],
    "Triticum aestivum": ["Lr34", "Yr15"],
    "Zea mays": ["ZmDREB2A"],
}


class TaxonomyGenomicsService:
    async def validate_species_gbif(self, crop_name: str) -> GBIFSpeciesMatch:
        key = crop_name.strip().lower()
        ambiguous = AMBIGUOUS_CROPS.get(key, [])
        curated = CURATED_TAXONOMY.get(key)
        query_name = curated["scientific"] if curated else crop_name.strip()

        data = await fetch_json_with_resilience(
            provider_key="gbif",
            url="https://api.gbif.org/v1/species/match",
            params={"name": query_name, "kingdom": "Plantae"},
            timeout_s=4.5,
            cache_ttl_s=86400,
        )

        if data and data.get("usageKey") and (data.get("rank") == "SPECIES" or data.get("species")):
            return GBIFSpeciesMatch(
                input_crop_name=crop_name,
                accepted_scientific_name=data.get("species") or data.get("canonicalName") or query_name,
                common_names=curated["common"] if curated else [crop_name],
                taxon_key=data.get("usageKey"),
                genus=data.get("genus"),
                family=data.get("family"),
                synonyms=curated["synonyms"] if curated else [],
                match_type=data.get("matchType", "EXACT"),
                confidence=data.get("confidence"),
                ambiguous_candidates=ambiguous,
                source_provider="GBIF Species API (Live)",
                is_live=True,
            )

        # Fallback to curated binomial taxonomy
        if curated:
            return GBIFSpeciesMatch(
                input_crop_name=crop_name,
                accepted_scientific_name=curated["scientific"],
                common_names=curated["common"],
                taxon_key=curated["taxon_key"],
                genus=curated["genus"],
                family=curated["family"],
                synonyms=curated["synonyms"],
                match_type="CURATED_FALLBACK",
                confidence=95,
                ambiguous_candidates=ambiguous,
                source_provider="GBIF Curated Binomial Cache",
                is_live=False,
            )

        return GBIFSpeciesMatch(
            input_crop_name=crop_name,
            accepted_scientific_name=crop_name.strip(),
            common_names=[crop_name.strip()],
            match_type="UNVERIFIED",
            ambiguous_candidates=ambiguous,
            source_provider="Unverified Crop Name",
            is_live=False,
        )

    async def fetch_enhanced_europe_pmc(
        self, crop_name: str, scientific_name: str, problems: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Queries Europe PMC, classifies publication types (field_trial, lab_experiment,
        review_article, preprint), deduplicates by DOI/PMID, and ranks by relevance.
        """
        problem_q = problems[0].strip() if problems else "disease resistance"
        resp = biotech_service.fetch_research_papers(
            crop=crop_name,
            problem=problem_q,
            page_size=10,
        )
        if not resp.is_live and scientific_name != crop_name:
            resp = biotech_service.fetch_research_papers(
                crop=scientific_name,
                problem=problem_q,
                page_size=10,
            )

        seen_ids = set()
        ranked: List[Dict[str, Any]] = []
        for p in resp.papers:
            dedup_key = (p.doi or p.pmid or p.title).lower().strip()
            if dedup_key in seen_ids:
                continue
            seen_ids.add(dedup_key)

            text = f"{p.title} {p.abstract_text or ''}".lower()
            if "preprint" in text or "biorxiv" in (p.journal_title or "").lower():
                pub_type = "preprint"
            elif any(k in text for k in ["meta-analysis", "systematic review", "review"]):
                pub_type = "review_article"
            elif any(k in text for k in ["field trial", "field experiment", "multi-season", "plot"]):
                pub_type = "field_trial"
            elif any(k in text for k in ["in vitro", "greenhouse", "laboratory", "pcr", "transcriptome"]):
                pub_type = "lab_experiment"
            else:
                pub_type = "field_trial" if p.evidence_type == "established_practice" else "lab_experiment"

            score = 0
            if crop_name.lower() in text or scientific_name.lower() in text:
                score += 3
            for prob in problems:
                if prob.lower().split()[0] in text:
                    score += 2
            if pub_type in ("field_trial", "review_article"):
                score += 2

            ranked.append({
                "title": p.title,
                "abstract": p.abstract_text,
                "authors": p.authors,
                "pub_year": p.pub_year,
                "doi": p.doi,
                "pmid": p.pmid,
                "journal": p.journal_title,
                "publication_type": pub_type,
                "evidence_type": p.evidence_type,
                "source_url": p.article_url,
                "relevance_score": score,
                "is_live": resp.is_live,
            })

        ranked.sort(key=lambda x: (x["relevance_score"], x.get("pub_year") or 0), reverse=True)
        return ranked

    async def fetch_ncbi_genetics(
        self, scientific_name: str, existing_pmids: List[str]
    ) -> NCBIGeneticEvidence:
        """
        Queries NCBI E-utilities (esearch + esummary on gene & pubmed) with API key/email if configured.
        Deduplicates PubMed records against Europe PMC PMIDs.
        """
        base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
        common_params: Dict[str, Any] = {"retmode": "json"}
        if os.getenv("NCBI_API_KEY"):
            common_params["api_key"] = os.getenv("NCBI_API_KEY")
        if os.getenv("NCBI_EMAIL"):
            common_params["email"] = os.getenv("NCBI_EMAIL")

        genes: List[NCBIGeneRecord] = []
        pubmed_articles: List[Dict[str, Any]] = []
        is_live = False

        # 1. Search NCBI Gene for organism resistance/tolerance genes
        gene_search = await fetch_json_with_resilience(
            provider_key="ncbi",
            url=f"{base}/esearch.fcgi",
            params={
                **common_params,
                "db": "gene",
                "term": f'"{scientific_name}"[Organism] AND (resistance OR drought OR wilt)',
                "retmax": 4,
            },
            timeout_s=4.5,
            cache_ttl_s=3600,
        )
        gene_ids = (gene_search or {}).get("esearchresult", {}).get("idlist", [])
        if gene_ids:
            is_live = True
            gene_sum = await fetch_json_with_resilience(
                provider_key="ncbi",
                url=f"{base}/esummary.fcgi",
                params={**common_params, "db": "gene", "id": ",".join(gene_ids)},
                timeout_s=4.5,
                cache_ttl_s=3600,
            )
            result_map = (gene_sum or {}).get("result", {})
            for gid in gene_ids:
                g = result_map.get(gid)
                if isinstance(g, dict):
                    genes.append(NCBIGeneRecord(
                        gene_id=str(gid),
                        symbol=g.get("name") or f"LOC{gid}",
                        description=g.get("description") or "Documented plant gene locus",
                        organism=scientific_name,
                        chromosome=str(g.get("chromosome")) if g.get("chromosome") else None,
                        source_url=f"https://www.ncbi.nlm.nih.gov/gene/{gid}",
                    ))

        # 2. Search PubMed and deduplicate against Europe PMC PMIDs
        pm_search = await fetch_json_with_resilience(
            provider_key="ncbi",
            url=f"{base}/esearch.fcgi",
            params={
                **common_params,
                "db": "pubmed",
                "term": f'"{scientific_name}" AND ("disease resistance" OR "biofertilizer")',
                "retmax": 4,
            },
            timeout_s=4.5,
            cache_ttl_s=3600,
        )
        pmids = [
            pid for pid in (pm_search or {}).get("esearchresult", {}).get("idlist", [])
            if pid not in existing_pmids
        ]
        if pmids:
            is_live = True
            pm_sum = await fetch_json_with_resilience(
                provider_key="ncbi",
                url=f"{base}/esummary.fcgi",
                params={**common_params, "db": "pubmed", "id": ",".join(pmids)},
                timeout_s=4.5,
                cache_ttl_s=3600,
            )
            pm_map = (pm_sum or {}).get("result", {})
            for pid in pmids:
                art = pm_map.get(pid)
                if isinstance(art, dict):
                    pubmed_articles.append({
                        "pmid": str(pid),
                        "title": art.get("title", ""),
                        "pubdate": art.get("pubdate", ""),
                        "source": art.get("source", "PubMed"),
                        "url": f"https://pubmed.ncbi.nlm.nih.gov/{pid}/",
                    })

        return NCBIGeneticEvidence(
            organism_validated=scientific_name,
            genes=genes,
            pubmed_articles=pubmed_articles,
            nucleotide_accessions=[],
            is_live=is_live,
        )

    async def fetch_ensembl_plants(self, crop_name: str, scientific_name: str) -> EnsemblPlantGenomics:
        """
        Verifies whether the crop species is supported in Ensembl Plants and retrieves
        genome assembly metadata & release version when available.
        """
        curated = CURATED_TAXONOMY.get(crop_name.strip().lower())
        ensembl_sp = curated["ensembl"] if curated else scientific_name.lower().replace(" ", "_")

        if not ensembl_sp:
            return EnsemblPlantGenomics(
                species_requested=scientific_name,
                is_supported=False,
                is_live=False,
                limitations=f"{scientific_name} does not have a supported reference genome in Ensembl Plants.",
            )

        assembly = await fetch_json_with_resilience(
            provider_key="ensembl_plants",
            url=f"https://rest.ensembl.org/info/assembly/{ensembl_sp}",
            headers={"Content-Type": "application/json"},
            timeout_s=5.0,
            cache_ttl_s=86400,
        )

        if assembly and assembly.get("assembly_name"):
            return EnsemblPlantGenomics(
                species_requested=scientific_name,
                ensembl_species_name=ensembl_sp,
                is_supported=True,
                assembly_name=assembly.get("assembly_name"),
                release_version=str(assembly.get("genebuild_initial_release_date") or "Ensembl Plants"),
                gene_annotations=[
                    {"note": f"Reference assembly {assembly.get('assembly_name')} verified via Ensembl REST API"}
                ],
                is_live=True,
            )

        return EnsemblPlantGenomics(
            species_requested=scientific_name,
            ensembl_species_name=ensembl_sp,
            is_supported=False,
            is_live=False,
            limitations=f"Ensembl Plants REST endpoint unavailable or species '{ensembl_sp}' unsupported.",
        )


taxonomy_genomics_service = TaxonomyGenomicsService()
