"""Shared markup snippets for Miaozi v2.2 static demos."""

CAT_SVG = '''<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <!-- ears -->
  <path d="M20.5 30.5 L24 8.5 L38 26 Z" fill="#EFDCE4"/>
  <path d="M59.5 30.5 L56 8.5 L42 26 Z" fill="#EFDCE4"/>
  <path d="M24 27 L26.2 13.2 L35.5 25 Z" fill="#E8B7C8"/>
  <path d="M56 27 L53.8 13.2 L44.5 25 Z" fill="#E8B7C8"/>
  <!-- body -->
  <ellipse cx="40" cy="62" rx="18.5" ry="13.5" fill="#E8D0DA"/>
  <!-- tail -->
  <path d="M57 62 C70 58, 72 46, 66 40" stroke="#E8D0DA" stroke-width="5.5" stroke-linecap="round" fill="none"/>
  <!-- head -->
  <circle cx="40" cy="38" r="20" fill="#F1DEE6"/>
  <!-- blush -->
  <ellipse cx="27.5" cy="42.5" rx="4.2" ry="2.3" fill="#E8B7C8" opacity="0.7"/>
  <ellipse cx="52.5" cy="42.5" rx="4.2" ry="2.3" fill="#E8B7C8" opacity="0.7"/>
  <!-- eyes -->
  <ellipse cx="32.2" cy="36.2" rx="2.15" ry="2.8" fill="#3A2C36"/>
  <ellipse cx="47.8" cy="36.2" rx="2.15" ry="2.8" fill="#3A2C36"/>
  <circle cx="31.5" cy="35.2" r="0.7" fill="#FFFBFD"/>
  <circle cx="47.1" cy="35.2" r="0.7" fill="#FFFBFD"/>
  <!-- nose + mouth -->
  <path d="M40 41.4 L38.2 43.4 H41.8 Z" fill="#C47A96"/>
  <path d="M40 43.4 C37.4 46.2, 33.8 45.2, 32.8 44" stroke="#C47A96" stroke-width="1.15" stroke-linecap="round" fill="none"/>
  <path d="M40 43.4 C42.6 46.2, 46.2 45.2, 47.2 44" stroke="#C47A96" stroke-width="1.15" stroke-linecap="round" fill="none"/>
  <!-- tiny blue bell -->
  <circle cx="40" cy="56.5" r="3.1" fill="#C5D6EA"/>
  <circle cx="40" cy="56.5" r="1.15" fill="#FFFBFD" opacity="0.8"/>
  <path d="M40 59.6 V62.4" stroke="#A8BDD4" stroke-width="1.2" stroke-linecap="round"/>
</svg>'''

ICO_SUN = '''<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
  <circle cx="12" cy="12" r="3.4"/>
  <path d="M12 4.4v1.6M12 18v1.6M4.4 12h1.6M18 12h1.6M6.5 6.5l1.15 1.15M16.35 16.35l1.15 1.15M6.5 17.5l1.15-1.15M16.35 7.65l1.15-1.15"/>
</svg>'''

ICO_GEAR = '''<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <circle cx="12" cy="12" r="3"/>
  <path d="M12 4.2l.7 1.7a6.8 6.8 0 012.6 1.5l1.8-.4.9 1.6-1.2 1.4c.2.5.3 1 .3 1.6 0 .5-.1 1.1-.3 1.6l1.2 1.4-.9 1.6-1.8-.4a6.8 6.8 0 01-2.6 1.5L12 19.8l-.7-1.7a6.8 6.8 0 01-2.6-1.5l-1.8.4-.9-1.6 1.2-1.4A6.2 6.2 0 017 12c0-.6.1-1.1.3-1.6L6.1 9l.9-1.6 1.8.4A6.8 6.8 0 0111.3 6L12 4.2z"/>
</svg>'''

def nav(current: str, portrait: bool = False) -> str:
    items = [
        ("today", "Hôm nay", ICO_SUN, False),
        ("write", "Viết", "写", False),
        ("lesson", "Bài học", "课", True),
        ("extra", "Luyện thêm", "练", False),
        ("settings", "Cài đặt", ICO_GEAR, False),
    ]
    out = ['<nav class="nav" aria-label="Điều hướng">']
    for key, label, ico, is_lesson in items:
        cls = "nav-item"
        if key == current:
            cls += " is-current"
        if is_lesson:
            cls += " is-lesson"
        icon = ico if ico.startswith("<") else f'<span class="hz">{ico}</span>'
        out.append(
            f'<div class="{cls}" data-nav="{key}">'
            f'<span class="ico">{icon}</span>'
            f'<span class="lbl">{label}</span>'
            f'</div>'
        )
    out.append("</nav>")
    brand = "" if portrait else f'''<div class="brand">
      <div class="cat" style="width:42px;height:42px">{CAT_SVG}</div>
      <div class="name">Miaozi</div>
    </div>'''
    return f'{brand}\n    {"".join(out)}'


def head(title: str, shell: str) -> str:
    return f'''<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<link rel="stylesheet" href="theme.css">
<link rel="stylesheet" href="pages.css">
</head>
<body class="shell-{shell}">
<div class="app">
'''

FOOT = """
</div>
</body>
</html>
"""
