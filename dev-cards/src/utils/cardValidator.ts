import type { DevCardDraft, ValidationIssue } from '../types';

const ALLOWED_TOKENS = new Set(['p1', 'p2', 'p3', 'p4', 'sips']);

interface BraceScanResult {
  hasBrokenSyntax: boolean;
  tokens: string[];
}

function scanBraces(input: string): BraceScanResult {
  let hasBrokenSyntax = false;
  const tokens: string[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];
    if (ch === '{') {
      const closeIdx = input.indexOf('}', i + 1);
      const nextOpenIdx = input.indexOf('{', i + 1);
      if (closeIdx === -1 || (nextOpenIdx !== -1 && nextOpenIdx < closeIdx)) {
        hasBrokenSyntax = true;
        i += 1;
        continue;
      }
      const token = input.slice(i + 1, closeIdx);
      tokens.push(token);
      i = closeIdx + 1;
    } else if (ch === '}') {
      hasBrokenSyntax = true;
      i += 1;
    } else {
      i += 1;
    }
  }

  return { hasBrokenSyntax, tokens };
}

export function validateCardDraft(card: DevCardDraft): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const fields: { name: string; value: string }[] = [
    { name: 'titre', value: card.title || '' },
    { name: 'contenu', value: card.content || '' },
    { name: 'extra', value: card.extra || '' },
  ];

  let maxPlayerIndex = 0;
  let hasSipsInContentOrExtra = false;
  let hasSipsAnywhere = false;

  // 1. Syntaxe cassée ou variable invalide
  for (const field of fields) {
    if (!field.value) continue;
    const { hasBrokenSyntax, tokens } = scanBraces(field.value);
    if (hasBrokenSyntax) {
      issues.push({
        code: `broken_syntax_${field.name}`,
        message: `Accolade non fermée ou orpheline dans « ${field.name} ».`,
      });
    }

    for (const token of tokens) {
      if (!ALLOWED_TOKENS.has(token)) {
        if (ALLOWED_TOKENS.has(token.toLowerCase())) {
          issues.push({
            code: `uppercase_var_${field.name}_${token}`,
            message: `Variable en majuscule {${token}} dans « ${field.name} » (utiliser {${token.toLowerCase()}}).`,
          });
        } else {
          issues.push({
            code: `unknown_var_${field.name}_${token}`,
            message: `Variable non reconnue {${token}} dans « ${field.name} » (autorisées : {p1}..{p4}, {sips}).`,
          });
        }
        continue;
      }

      if (token.startsWith('p')) {
        const idx = Number(token.slice(1));
        if (idx > maxPlayerIndex) {
          maxPlayerIndex = idx;
        }
      } else if (token === 'sips') {
        hasSipsAnywhere = true;
        if (field.name === 'contenu' || field.name === 'extra') {
          hasSipsInContentOrExtra = true;
        }
      }
    }
  }

  const minPlayers = Number(card.min_players) || 0;
  const sips = Number(card.sips) || 0;

  // 2. Sous-effectif (min_players trop bas par rapport aux {pX})
  if (maxPlayerIndex >= 2 && minPlayers < maxPlayerIndex) {
    issues.push({
      code: 'under_min_players',
      message: `Sous-effectif : {p${maxPlayerIndex}} est utilisé mais min_players = ${minPlayers} (attendu ≥ ${maxPlayerIndex}).`,
    });
  }

  // 3. Sur-effectif (min_players supérieur au plus grand {pX} utilisé)
  if (maxPlayerIndex > 0 && minPlayers > maxPlayerIndex) {
    issues.push({
      code: 'over_min_players',
      message: `Sur-effectif : min_players = ${minPlayers} alors que le plus grand placeholder utilisé est {p${maxPlayerIndex}}.`,
    });
  }

  // 4. Incohérence {sips}
  if (sips > 0 && card.game !== 'crise' && !hasSipsInContentOrExtra) {
    issues.push({
      code: 'sips_missing_placeholder',
      message: `Incohérence gorgées : sips = ${sips} mais {sips} n'apparaît ni dans le contenu ni dans l'extra.`,
    });
  }
  if (hasSipsAnywhere && sips === 0) {
    issues.push({
      code: 'sips_zero_value',
      message: `Incohérence gorgées : {sips} est écrit dans le texte alors que sips = 0.`,
    });
  }

  // 5. Structure L'Infiltré
  if (card.game === 'infiltre') {
    const contentWords = (card.content || '').trim().split(/\s+/).filter(Boolean);
    const extraTrimmed = (card.extra || '').trim();
    const extraWords = extraTrimmed.split(/\s+/).filter(Boolean);

    if (!extraTrimmed) {
      issues.push({
        code: 'infiltre_missing_extra',
        message: "Structure L'Infiltré : le mot de l'infiltré (champ extra) est manquant.",
      });
    }
    if (contentWords.length > 3) {
      issues.push({
        code: 'infiltre_long_content',
        message: `Structure L'Infiltré : le mot Éclaireurs contient ${contentWords.length} mots (attendu : ≤ 3 mots).`,
      });
    }
    if (extraWords.length > 3) {
      issues.push({
        code: 'infiltre_long_extra',
        message: `Structure L'Infiltré : le mot de l'Infiltré contient ${extraWords.length} mots (attendu : ≤ 3 mots).`,
      });
    }
  }

  return issues;
}

export function renderPreviewText(
  text: string,
  sampleNames: string[],
  sips: number
): string {
  if (!text) return '';
  let rendered = text;

  rendered = rendered.replace(/\{p1\}/g, sampleNames[0] || 'Léo');
  rendered = rendered.replace(/\{p2\}/g, sampleNames[1] || 'Camille');
  rendered = rendered.replace(/\{p3\}/g, sampleNames[2] || 'Théo');
  rendered = rendered.replace(/\{p4\}/g, sampleNames[3] || 'Chloé');

  // Accord singulier / pluriel automatique autour de {sips} gorgée(s)
  rendered = rendered.replace(/\{sips\}\s+gorgées?/g, () =>
    sips === 1 ? '1 gorgée' : `${sips} gorgées`
  );
  rendered = rendered.replace(/\{sips\}/g, String(sips));

  return rendered;
}
