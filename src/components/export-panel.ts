/**
 * The view bar's SVG export button and its options panel (issue #25): which
 * theme to draw in, whether to show the chain icons, and whether to fill the
 * background.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** What the export panel asks for. */
export interface ExportChoice {
  theme: string;
  chainIcons: boolean;
  background: boolean;
}

/** A new export button for the view bar; `onClick` opens or closes the panel. */
export function createExportButton(onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'export-button';
  b.title = 'Export the 1-D or 2-D view as an SVG file';
  b.setAttribute('aria-expanded', 'false');
  b.append(downloadIcon(), 'SVG');
  b.addEventListener('click', onClick);
  return b;
}

/**
 * The options panel: theme, chain icons and background, then Download and
 * Cancel. Escape cancels.
 */
export function renderExportPanel({
  themes,
  initial,
  onExport,
  onClose,
}: {
  themes: string[];
  initial: ExportChoice;
  onExport: (choice: ExportChoice) => void;
  onClose: () => void;
}): HTMLFormElement {
  const form = document.createElement('form');
  form.className = 'export-panel';
  form.setAttribute('role', 'dialog');
  form.setAttribute('aria-label', 'Export SVG');

  const themeLabel = document.createElement('label');
  themeLabel.append('Theme ');
  const select = document.createElement('select');
  select.name = 'theme';
  for (const name of themes) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    option.selected = name === initial.theme;
    select.appendChild(option);
  }
  themeLabel.appendChild(select);

  const checkbox = (name: string, text: string, checked: boolean) => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = name;
    input.checked = checked;
    label.append(input, ` ${text}`);
    return { label, input };
  };
  const icons = checkbox('chain-icons', 'Chain icons', initial.chainIcons);
  const background = checkbox('background', 'Background', initial.background);

  const download = document.createElement('button');
  download.type = 'submit';
  download.className = 'export-download';
  download.textContent = 'Download';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'export-cancel';
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', onClose);

  form.append(themeLabel, icons.label, background.label, download, cancel);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    onExport({
      theme: select.value,
      chainIcons: icons.input.checked,
      background: background.input.checked,
    });
  });
  form.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    onClose();
  });
  return form;
}

/** Save `text` as an SVG file called `filename`. */
export function downloadSvg(text: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** An arrow down onto a tray. */
function downloadIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M8 1v9M4 6l4 4 4-4M2 11v4h12v-4');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '2');
  svg.appendChild(path);
  return svg;
}
