from .identity import IDENTITY
from .objectives import OBJECTIVES
from .knowledge import KNOWLEDGE
from .language import LANGUAGE
from .guardrails import GUARDRAILS
from .style import STYLE
from .greeting import GREETING
from .conversation_memory import CONVERSATION_MEMORY

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
"""