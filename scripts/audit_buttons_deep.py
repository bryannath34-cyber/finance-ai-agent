import re

with open('app/static/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

with open('app/static/js/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

elements = re.findall(r'<(button|a)\s+([^>]+)>', html)
print(f'Total <button> and <a> elements in index.html: {len(elements)}')

unwired = []
for tag, attrs in elements:
    id_m = re.search(r'id=["\']([^"\']+)["\']', attrs)
    data_tab_m = re.search(r'data-tab=["\']([^"\']+)["\']', attrs)
    class_m = re.search(r'class=["\']([^"\']+)["\']', attrs)
    type_m = re.search(r'type=["\']([^"\']+)["\']', attrs)
    href_m = re.search(r'href=["\']([^"\']+)["\']', attrs)
    
    b_id = id_m.group(1) if id_m else None
    data_tab = data_tab_m.group(1) if data_tab_m else None
    b_class = class_m.group(1) if class_m else ''
    b_type = type_m.group(1) if type_m else ''
    b_href = href_m.group(1) if href_m else ''

    if b_type == 'submit' or data_tab:
        continue
    if b_href and not b_href.startswith('#') and not b_href.startswith('javascript:'):
        continue

    # Check if this id or class has an event listener or modal bind in app.js
    is_wired = False
    if b_id:
        # Check direct mentions in app.js
        for line in js.splitlines():
            if b_id in line and any(kw in line for kw in ['addEventListener', 'bindOpenModal', 'onclick', 'openModal', 'switchTab']):
                is_wired = True
                break
        # Also check if camelCase version has addEventListener
        parts = b_id.split('-')
        camel = parts[0] + ''.join(p.capitalize() for p in parts[1:])
        for line in js.splitlines():
            if camel in line and any(kw in line for kw in ['addEventListener', 'bindOpenModal', 'onclick', 'openModal', 'switchTab']):
                is_wired = True
                break

    # Check class based listeners
    classes = b_class.split()
    for c in classes:
        if c in ['btn-close-modal', 'modal-close', 'tab-btn', 'sidebar-nav-btn', 'mobile-nav-btn', 'chart-series-btn', 'btn-view-period', 'toggle-switch', 'tx-type-btn', 'btn-primary-dark']:
            is_wired = True
            break

    if not is_wired:
        unwired.append((tag, b_id, b_class, attrs.strip()[:90]))

print(f'\nFound {len(unwired)} unwired buttons/links:')
for u in unwired:
    print(f'  <{u[0]}> ID: {u[1]} | Class: {u[2]} | Raw: {u[3]}')
