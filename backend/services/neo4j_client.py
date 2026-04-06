import os
from typing import Any, Optional

from neo4j import AsyncGraphDatabase, AsyncDriver

NEO4J_URI: str = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER: str = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD: str = os.getenv("NEO4J_PASSWORD", "")
ENABLE_NEO4J: bool = os.getenv("ENABLE_NEO4J", "true").lower() in ("true", "1", "yes")

_neo4j_driver: Optional[AsyncDriver] = None


def get_neo4j_driver() -> AsyncDriver:
    global _neo4j_driver
    if _neo4j_driver is None:
        _neo4j_driver = AsyncGraphDatabase.driver(
            NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD)
        )
    return _neo4j_driver


async def close_neo4j_driver() -> None:
    global _neo4j_driver
    if _neo4j_driver is not None:
        await _neo4j_driver.close()
        _neo4j_driver = None


async def create_document_node(
    document_id: str,
    filename: str,
    tenant_id: str,
    workspace_id: str,
    content_type: str,
    file_size: int,
) -> dict[str, Any]:
    driver = get_neo4j_driver()
    async with driver.session() as session:
        result = await session.run(
            """
            MERGE (d:Document {document_id: $document_id})
            SET d.filename = $filename,
                d.tenant_id = $tenant_id,
                d.workspace_id = $workspace_id,
                d.content_type = $content_type,
                d.file_size = $file_size,
                d.updated_at = datetime()
            RETURN d.document_id AS document_id, d.filename AS filename
            """,
            document_id=document_id,
            filename=filename,
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            content_type=content_type,
            file_size=file_size,
        )
        record = await result.single()
        return dict(record) if record else {}


async def create_chunk_nodes(
    document_id: str,
    chunks: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    driver = get_neo4j_driver()
    created = []
    async with driver.session() as session:
        for chunk in chunks:
            result = await session.run(
                """
                MATCH (d:Document {document_id: $document_id})
                CREATE (c:Chunk {
                    chunk_id: $chunk_id,
                    text: $text,
                    index: $index,
                    created_at: datetime()
                })
                CREATE (d)-[:HAS_CHUNK]->(c)
                RETURN c.chunk_id AS chunk_id, c.index AS chunk_index
                """,
                document_id=document_id,
                chunk_id=chunk["chunk_id"],
                text=chunk["text"],
                index=chunk["index"],
            )
            record = await result.single()
            if record:
                created.append(dict(record))
    return created


async def create_entity_nodes(
    document_id: str,
    entities: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    driver = get_neo4j_driver()
    created = []
    async with driver.session() as session:
        for entity in entities:
            result = await session.run(
                """
                MATCH (d:Document {document_id: $document_id})
                MERGE (e:Entity {entity_id: $entity_id})
                SET e.name = $name, e.type = $entity_type, e.updated_at = datetime()
                CREATE (d)-[:CONTAINS_ENTITY]->(e)
                RETURN e.entity_id AS entity_id, e.name AS name
                """,
                document_id=document_id,
                entity_id=entity["entity_id"],
                name=entity["name"],
                entity_type=entity["entity_type"],
            )
            record = await result.single()
            if record:
                created.append(dict(record))
    return created


async def create_relationships(
    relationships: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    driver = get_neo4j_driver()
    created = []
    async with driver.session() as session:
        for rel in relationships:
            result = await session.run(
                """
                MATCH (a:Entity {entity_id: $source_id})
                MATCH (b:Entity {entity_id: $target_id})
                MERGE (a)-[r:RELATED_TO {rel_type: $rel_type}]->(b)
                SET r.description = $description, r.updated_at = datetime()
                RETURN type(r) AS relationship_type
                """,
                source_id=rel["source_id"],
                target_id=rel["target_id"],
                rel_type=rel["rel_type"],
                description=rel.get("description", ""),
            )
            record = await result.single()
            if record:
                created.append(dict(record))
    return created


async def query_graph_context(
    tenant_id: str,
    workspace_id: str,
    query_text: str,
    limit: int = 10,
) -> list[dict[str, Any]]:
    driver = get_neo4j_driver()
    async with driver.session() as session:
        result = await session.run(
            """
            MATCH (d:Document {tenant_id: $tenant_id, workspace_id: $workspace_id})
            MATCH (d)-[:HAS_CHUNK]->(c:Chunk)
            WHERE toLower(c.text) CONTAINS toLower($query_text)
            RETURN c.chunk_id AS chunk_id, c.text AS text, c.index AS chunk_index
            ORDER BY c.index
            LIMIT $limit
            """,
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            query_text=query_text,
            limit=limit,
        )
        records = []
        async for record in result:
            records.append(dict(record))
        return records


async def query_related_entities(
    tenant_id: str,
    workspace_id: str,
    entity_names: list[str],
    limit: int = 20,
) -> list[dict[str, Any]]:
    driver = get_neo4j_driver()
    async with driver.session() as session:
        result = await session.run(
            """
            MATCH (d:Document {tenant_id: $tenant_id, workspace_id: $workspace_id})
            MATCH (d)-[:CONTAINS_ENTITY]->(e:Entity)
            WHERE e.name IN $entity_names
            OPTIONAL MATCH (e)-[r:RELATED_TO]->(other:Entity)
            RETURN e.name AS entity_name, e.type AS entity_type,
                   other.name AS related_name, r.rel_type AS relationship_type,
                   r.description AS relationship_description
            LIMIT $limit
            """,
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            entity_names=entity_names,
            limit=limit,
        )
        records = []
        async for record in result:
            records.append(dict(record))
        return records


async def health_check() -> bool:
    if not ENABLE_NEO4J:
        return True
    try:
        driver = get_neo4j_driver()
        async with driver.session() as session:
            await session.run("RETURN 1")
        return True
    except Exception:
        return False


async def search_graph(
    query_text: str,
    top_k: int = 5,
    tenant_id: str = "",
    workspace_id: str = "",
) -> list[dict[str, Any]]:
    """Search the graph for relevant chunks and entities.

    This is a wrapper around query_graph_context that can work with
    optional tenant_id/workspace_id for filtering.
    """
    if not ENABLE_NEO4J:
        return []
    if tenant_id and workspace_id:
        return await query_graph_context(
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            query_text=query_text,
            limit=top_k,
        )
    return []
