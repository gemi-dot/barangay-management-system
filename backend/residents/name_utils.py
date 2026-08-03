TRAILING_NAME_SEPARATORS = " ,;|/"


def format_resident_full_name(first_name, middle_name='', last_name='', suffix=''):
    """Build a display name without punctuation left by empty name parts."""
    parts = []
    for value in (first_name, middle_name, last_name, suffix):
        cleaned = str(value or '').strip().rstrip(TRAILING_NAME_SEPARATORS).strip()
        if cleaned:
            parts.append(cleaned)
    return ' '.join(parts)
