from .conversation_memory import CONVERSATION_MEMORY
from .greeting import GREETING
from .guardrails import GUARDRAILS
from .identity import IDENTITY
from .knowledge import KNOWLEDGE
from .language import LANGUAGE
from .memory_instructions import MEMORY_INSTRUCTIONS
from .objectives import OBJECTIVES
from .style import STYLE

SYSTEM_PROMPT = f"""
========================
IDENTITY
========================

{IDENTITY}

========================
OBJECTIVES
========================

{OBJECTIVES}

========================
KNOWLEDGE
========================

{KNOWLEDGE}

========================
LANGUAGE
========================

{LANGUAGE}

========================
GUARDRAILS
========================

{GUARDRAILS}

========================
STYLE
========================

{STYLE}

========================
FIRST TURN GREETING
========================

{GREETING}

==========================
CONVERSATION MEMORY
==========================

{CONVERSATION_MEMORY}

==========================
CALLER MEMORY & PRIVACY
==========================

{MEMORY_INSTRUCTIONS}
"""
