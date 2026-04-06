import os
from typing import Any, Optional

from langfuse import Langfuse
from openai import AsyncOpenAI

OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL: str = os.getenv(
    "OPENROUTER_MODEL_DEV", "google/gemini-3.1-flash-lite-preview"
)
LANGFUSE_PUBLIC_KEY: str = os.getenv("LANGFUSE_PUBLIC_KEY", "")
LANGFUSE_SECRET_KEY: str = os.getenv("LANGFUSE_SECRET_KEY", "")
LANGFUSE_HOST: str = os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com")

_langfuse_client: Optional[Langfuse] = None
_openai_client: Optional[AsyncOpenAI] = None


def get_langfuse_client() -> Langfuse:
    global _langfuse_client
    if _langfuse_client is None:
        _langfuse_client = Langfuse(
            public_key=LANGFUSE_PUBLIC_KEY,
            secret_key=LANGFUSE_SECRET_KEY,
            host=LANGFUSE_HOST,
        )
    return _langfuse_client


def get_openai_client() -> AsyncOpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
            default_headers={
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Enterprise RAG",
            },
        )
    return _openai_client


def build_rag_prompt(
    user_message: str,
    vector_context: str,
    graph_context: str,
    chat_history: str,
) -> str:
    sections = []

    sections.append(
        "You are a helpful enterprise RAG assistant. Answer based ONLY on the provided context."
    )
    sections.append("")

    if chat_history:
        sections.append("## Conversation History")
        sections.append(chat_history)
        sections.append("")

    sections.append("## Vector Search Context")
    sections.append(
        vector_context if vector_context else "No vector context available."
    )
    sections.append("")

    if graph_context:
        sections.append("## Graph Knowledge Context")
        sections.append(graph_context)
        sections.append("")

    sections.append("## User Question")
    sections.append(user_message)
    sections.append("")

    sections.append(
        "Provide a clear, grounded answer. Cite specific sources from the context when possible. "
        "If the context does not contain enough information, say so explicitly."
    )

    return "\n".join(sections)


async def generate_response(
    prompt: str,
    model: Optional[str] = None,
    temperature: float = 0.3,
    max_tokens: int = 3500,
    session_id: Optional[str] = None,
    user_id: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    model_name = model or OPENROUTER_MODEL
    langfuse = get_langfuse_client()
    client = get_openai_client()

    try:
        lf_metadata = {**(metadata or {})}
        if session_id:
            lf_metadata["session_id"] = session_id
        if user_id:
            lf_metadata["user_id"] = user_id

        with langfuse.start_as_current_observation(
            name="rag-chat-completion",
            as_type="span",
            metadata=lf_metadata,
        ) as trace_span:
            with langfuse.start_as_current_observation(
                name="openrouter-call",
                as_type="generation",
                input=prompt,
                model=model_name,
                model_parameters={"temperature": temperature, "max_tokens": max_tokens},
            ) as generation:
                response = await client.chat.completions.create(
                    model=model_name,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=temperature,
                    max_tokens=max_tokens,
                )

                assistant_message = response.choices[0].message
                content = assistant_message.content or ""
                reasoning_details = getattr(
                    assistant_message, "reasoning_details", None
                )
                usage = response.usage.model_dump() if response.usage else {}

                usage_details = {
                    "prompt_tokens": usage.get("prompt_tokens", 0),
                    "completion_tokens": usage.get("completion_tokens", 0),
                    "total_tokens": usage.get("total_tokens", 0),
                }

                generation.update(
                    output=content,
                    usage_details=usage_details,
                )

                trace_span.update(metadata={"model": model_name, "status": "success"})

                result = {
                    "content": content,
                    "model": model_name,
                    "usage": usage,
                }
                if reasoning_details:
                    result["reasoning_details"] = reasoning_details

                return result

    except Exception as exc:
        import logging

        logging.getLogger(__name__).error("LLM generation failed: %s", exc)
        raise


async def health_check() -> bool:
    try:
        client = get_openai_client()
        response = await client.chat.completions.create(
            model="openai/gpt-3.5-turbo",
            messages=[{"role": "user", "content": "test"}],
            max_tokens=10,
        )
        return response.choices is not None and len(response.choices) > 0
    except Exception:
        return False
