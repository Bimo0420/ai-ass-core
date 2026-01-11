"""
title: RAG Reranking Pipeline
author: AI Assistant
date: 2026-01-11
version: 1.0.0
license: MIT
description: Pipeline that integrates LlamaIndex API for RAG with BGE reranking support for Russian language.
requirements: aiohttp
"""

from typing import List, Optional, Generator, Iterator
import os
import aiohttp
import json

from pydantic import BaseModel


class Pipeline:
    class Valves(BaseModel):
        pipelines: List[str] = []
        priority: int = 0
        llamaindex_url: str = "http://llamaindex:8000"
        top_k: int = 3
        use_reranking: bool = True
        min_score: float = 0.5
        context_template: str = """Используй следующий контекст для ответа на вопрос пользователя.
Если информация в контексте не помогает ответить на вопрос, скажи об этом честно.

---
КОНТЕКСТ:
{context}
---

ВОПРОС ПОЛЬЗОВАТЕЛЯ: {query}

ОТВЕТ:"""
        debug: bool = False

    def __init__(self):
        self.type = "filter"
        self.name = "RAG Reranking Pipeline"
        
        self.valves = self.Valves(
            **{
                "pipelines": ["*"],
                "llamaindex_url": os.getenv("LLAMAINDEX_URL", "http://llamaindex:8000"),
                "top_k": int(os.getenv("RAG_TOP_K", "3")),
                "use_reranking": os.getenv("RAG_USE_RERANKING", "true").lower() == "true",
                "min_score": float(os.getenv("RAG_MIN_SCORE", "0.5")),
                "debug": os.getenv("DEBUG_MODE", "false").lower() == "true",
            }
        )

    def log(self, message: str):
        if self.valves.debug:
            print(f"[RAG Pipeline DEBUG] {message}")

    async def on_startup(self):
        self.log(f"RAG Reranking Pipeline started")
        self.log(f"LlamaIndex URL: {self.valves.llamaindex_url}")

    async def on_shutdown(self):
        self.log("RAG Reranking Pipeline shutting down")

    async def on_valves_updated(self):
        self.log("Valves updated")

    async def search_documents(self, query: str) -> dict:
        """Call LlamaIndex API to search documents with reranking"""
        url = f"{self.valves.llamaindex_url}/query"
        
        payload = {
            "query": query,
            "top_k": self.valves.top_k,
            "use_reranking": self.valves.use_reranking
        }
        
        self.log(f"Searching: {query}")
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        self.log(f"Found {len(result.get('sources', []))} sources")
                        return result
                    else:
                        self.log(f"Error: {response.status}")
                        return {"sources": [], "error": f"Status {response.status}"}
        except Exception as e:
            self.log(f"Exception: {str(e)}")
            return {"sources": [], "error": str(e)}

    def format_context(self, sources: List[dict]) -> str:
        """Format retrieved sources into context string"""
        if not sources:
            return ""
        
        context_parts = []
        for i, source in enumerate(sources, 1):
            score = source.get("score", 0)
            
            # Filter by minimum score
            if score < self.valves.min_score:
                continue
                
            text = source.get("text", "")
            metadata = source.get("metadata", {})
            filename = metadata.get("file_name", "unknown")
            
            context_parts.append(f"[{i}] (relevance: {score:.2f}, source: {filename})\n{text}")
        
        return "\n\n".join(context_parts)

    async def inlet(self, body: dict, user: Optional[dict] = None) -> dict:
        """
        Intercept incoming messages, search for relevant context,
        and inject it into the prompt.
        """
        self.log(f"Inlet called with body keys: {body.keys()}")
        
        messages = body.get("messages", [])
        if not messages:
            return body
        
        # Get the last user message
        last_message = None
        for msg in reversed(messages):
            if msg.get("role") == "user":
                last_message = msg
                break
        
        if not last_message:
            return body
        
        query = last_message.get("content", "")
        if not query or len(query) < 3:
            return body
        
        self.log(f"Processing query: {query[:100]}...")
        
        # Search for relevant documents
        search_result = await self.search_documents(query)
        sources = search_result.get("sources", [])
        
        if not sources:
            self.log("No sources found, passing through original message")
            return body
        
        # Format context
        context = self.format_context(sources)
        
        if not context:
            self.log("All sources below min_score threshold")
            return body
        
        # Create enhanced prompt
        enhanced_content = self.valves.context_template.format(
            context=context,
            query=query
        )
        
        # Update the last user message with context
        for msg in reversed(messages):
            if msg.get("role") == "user":
                msg["content"] = enhanced_content
                self.log(f"Enhanced message with {len(sources)} sources")
                break
        
        body["messages"] = messages
        return body

    async def outlet(self, body: dict, user: Optional[dict] = None) -> dict:
        """
        Post-process the response (optional).
        Currently just passes through.
        """
        return body
