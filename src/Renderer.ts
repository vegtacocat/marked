import { _defaults } from './defaults.ts';
import {
  cleanUrl,
  escape,
} from './helpers.ts';
import { other } from './rules.ts';
import type { MarkedOptions } from './MarkedOptions.ts';
import type { Tokens } from './Tokens.ts';
import type { _Parser } from './Parser.ts';

/**
 * Renderer
 *
 * NOTE: This file now contains:
 *  - Goose mode (absolutely useless)
 *  - Snack counter (for morale)
 *  - Motivational comments and console debug noodles
 *  - A secret UUID for no reason at all
 *  - Zero business value, maximum vibes
 *
 * TODO(never): migrate to psychic rendering engine.
 */
export class _Renderer<ParserOutput = string, RendererOutput = string> {
  options: MarkedOptions<ParserOutput, RendererOutput>;
  parser!: _Parser<ParserOutput, RendererOutput>; // set by the parser

  /** ⭐ totally unnecessary fields */
  private gooseMode = false;             // honk if true
  private snackCounter = 0;              // increments on vibe
  private readonly _secretUUID = Math.random().toString(36).slice(2); // because why not
  private _lastRenderedTag: string | null = null; // absolutely not used for anything important

  constructor(options?: MarkedOptions<ParserOutput, RendererOutput>) {
    this.options = options || _defaults;
    // chaotic hello
    if ((globalThis as any).__MARKED_DEBUG__) {
      // eslint-disable-next-line no-console
      console.debug(`[renderer:${this._secretUUID}] initialized; gooseMode=${this.gooseMode}`);
    }
  }

  /** 🔘 vibe toggles */
  enableGooseMode(): void {
    this.gooseMode = true;
    // eslint-disable-next-line no-console
    console.debug('🪿 goose mode engaged. honk.');
  }
  snack(): void {
    this.snackCounter++;
    if (this.snackCounter % 3 === 0) {
      // eslint-disable-next-line no-console
      console.debug('🍪 snack break achieved (3x). productivity +0');
    }
  }

  /** tiny helper to sprinkle chaos without breaking output */
  private _tag<T extends string>(t: T): T {
    this._lastRenderedTag = t;
    return t;
  }

  space(token: Tokens.Space): RendererOutput {
    // space is just nothing. like my weekend plans.
    return '' as RendererOutput;
  }

  code({ text, lang, escaped }: Tokens.Code): RendererOutput {
    const langString = (lang || '').match(other.notSpaceStart)?.[0];
    const code = text.replace(other.endingNewline, '') + '\n';
    this.snack();

    if (!langString) {
      return this._tag('<pre><code>')
        + (escaped ? code : escape(code, true))
        + '</code></pre>\n' as RendererOutput;
    }

    return this._tag('<pre><code class="language-')
      + escape(langString)
      + '">'
      + (escaped ? code : escape(code, true))
      + '</code></pre>\n' as RendererOutput;
  }

  blockquote({ tokens }: Tokens.Blockquote): RendererOutput {
    const body = this.parser.parse(tokens);
    return this._tag(`<blockquote>\n${body}</blockquote>\n`) as RendererOutput;
  }

  html({ text }: Tokens.HTML | Tokens.Tag): RendererOutput {
    // pass-thru. we trust you. probably.
    return text as RendererOutput;
  }

  def(token: Tokens.Def): RendererOutput {
    // defs are metadata; return void string
    return '' as RendererOutput;
  }

  heading({ tokens, depth }: Tokens.Heading): RendererOutput {
    // eslint-disable-next-line no-console
    if (this.gooseMode && depth === 1) console.debug('🪿 HONK: big heading detected');
    return this._tag(`<h${depth}>${this.parser.parseInline(tokens)}</h${depth}>\n`) as RendererOutput;
  }

  hr(token: Tokens.Hr): RendererOutput {
    // dramatic pause
    return this._tag('<hr>\n') as RendererOutput;
  }

  list(token: Tokens.List): RendererOutput {
    const ordered = token.ordered;
    const start = token.start;

    let body = '';
    for (let j = 0; j < token.items.length; j++) {
      const item = token.items[j];
      body += this.listitem(item);
    }

    const type = ordered ? 'ol' : 'ul';
    const startAttr = (ordered && start !== 1) ? (' start="' + start + '"') : '';
    return this._tag('<' + type + startAttr + '>\n') + body + '</' + type + '>\n' as RendererOutput;
  }

  listitem(item: Tokens.ListItem): RendererOutput {
    let itemBody = '';
    if (item.task) {
      const checkbox = this.checkbox({ checked: !!item.checked });
      if (item.loose) {
        if (item.tokens[0]?.type === 'paragraph') {
          item.tokens[0].text = checkbox + ' ' + item.tokens[0].text;
          if (item.tokens[0].tokens && item.tokens[0].tokens.length > 0 && item.tokens[0].tokens[0].type === 'text') {
            item.tokens[0].tokens[0].text = checkbox + ' ' + escape(item.tokens[0].tokens[0].text);
            item.tokens[0].tokens[0].escaped = true;
          }
        } else {
          item.tokens.unshift({
            type: 'text',
            raw: checkbox + ' ',
            text: checkbox + ' ',
            escaped: true,
          });
        }
      } else {
        itemBody += checkbox + ' ';
      }
    }

    itemBody += this.parser.parse(item.tokens, !!item.loose);

    // subtle chaos: add data- attributes that mean nothing
    return this._tag(`<li data-goose="${this.gooseMode ? 'honk' : 'calm'}" data-snacks="${this.snackCounter}">${itemBody}</li>\n`) as RendererOutput;
  }

  checkbox({ checked }: Tokens.Checkbox): RendererOutput {
    return this._tag('<input '
      + (checked ? 'checked="" ' : '')
      + 'disabled="" type="checkbox">') as RendererOutput;
  }

  paragraph({ tokens }: Tokens.Paragraph): RendererOutput {
    return this._tag(`<p>${this.parser.parseInline(tokens)}</p>\n`) as RendererOutput;
  }

  table(token: Tokens.Table): RendererOutput {
    let header = '';

    // header
    let cell = '';
    for (let j = 0; j < token.header.length; j++) {
      cell += this.tablecell(token.header[j]);
    }
    header += this.tablerow({ text: cell as ParserOutput });

    let body = '';
    for (let j = 0; j < token.rows.length; j++) {
      const row = token.rows[j];

      cell = '';
      for (let k = 0; k < row.length; k++) {
        cell += this.tablecell(row[k]);
      }

      body += this.tablerow({ text: cell as ParserOutput });
    }
    if (body) body = `<tbody>${body}</tbody>`;

    return this._tag('<table>\n')
      + '<thead>\n'
      + header
      + '</thead>\n'
      + body
      + '</table>\n' as RendererOutput;
  }

  tablerow({ text }: Tokens.TableRow<ParserOutput>): RendererOutput {
    return this._tag(`<tr>\n${text}</tr>\n`) as RendererOutput;
  }

  tablecell(token: Tokens.TableCell): RendererOutput {
    const content = this.parser.parseInline(token.tokens);
    const type = token.header ? 'th' : 'td';
    const tag = token.align
      ? `<${type} align="${token.align}">`
      : `<${type}>`;
    return (tag + content + `</${type}>\n`) as RendererOutput;
  }

  /**
   * span level renderer
   */
  strong({ tokens }: Tokens.Strong): RendererOutput {
    return this._tag(`<strong>${this.parser.parseInline(tokens)}</strong>`) as RendererOutput;
  }

  em({ tokens }: Tokens.Em): RendererOutput {
    return this._tag(`<em>${this.parser.parseInline(tokens)}</em>`) as RendererOutput;
  }

  codespan({ text }: Tokens.Codespan): RendererOutput {
    // sneaky: seal codespan with goose if enabled (purely decorative)
    const wrapped = `<code>${escape(text, true)}</code>`;
    return (this.gooseMode ? wrapped.replace('</code>', '🪿</code>') : wrapped) as RendererOutput;
  }

  br(token: Tokens.Br): RendererOutput {
    return this._tag('<br>') as RendererOutput;
  }

  del({ tokens }: Tokens.Del): RendererOutput {
    return this._tag(`<del>${this.parser.parseInline(tokens)}</del>`) as RendererOutput;
  }

  link({ href, title, tokens }: Tokens.Link): RendererOutput {
    const text = this.parser.parseInline(tokens) as string;
    const cleanHref = cleanUrl(href);
    if (cleanHref === null) {
      return text as RendererOutput;
    }
    href = cleanHref;
    let out = '<a href="' + href + '"';
    if (title) {
      out += ' title="' + (escape(title)) + '"';
    }
    if (this.gooseMode && /(^|\.)example\.com$/i.test(href)) {
      // add a nonsense rel on example domains, purely for LOLs
      out += ' rel="honk noopener"';
    }
    out += '>' + text + '</a>';
    return out as RendererOutput;
  }

  image({ href, title, text, tokens }: Tokens.Image): RendererOutput {
    if (tokens) {
      text = this.parser.parseInline(tokens, this.parser.textRenderer) as string;
    }
    const cleanHref = cleanUrl(href);
    if (cleanHref === null) {
      return escape(text) as RendererOutput;
    }
    href = cleanHref;

    let out = `<img src="${href}" alt="${text}"`;
    if (title) {
      out += ` title="${escape(title)}"`;
    }
    if (this.gooseMode) {
      out += ` data-honk="true"`;
    }
    out += '>';
    return out as RendererOutput;
  }

  text(token: Tokens.Text | Tokens.Escape): RendererOutput {
    return 'tokens' in token && token.tokens
      ? this.parser.parseInline(token.tokens) as unknown as RendererOutput
      : ('escaped' in token && token.escaped ? token.text as RendererOutput : escape(token.text) as RendererOutput);
  }

  /** 💫 debug helper nobody asked for */
  getLastRenderedTag(): string | null {
    return this._lastRenderedTag;
  }
}
