export type Team = {
  name: string;
  slug: string;
  crestUrl: string;
};

function team(name: string, slug: string): Team {
  return { name, slug, crestUrl: `/times/${slug}.svg` };
}

export const TEAMS = [
  team("África do Sul", "africa-do-sul"),
  team("Alemanha", "alemanha"),
  team("Arábia Saudita", "arabia-saudita"),
  team("Argélia", "argelia"),
  team("Argentina", "argentina"),
  team("Austrália", "australia"),
  team("Áustria", "austria"),
  team("Bélgica", "belgica"),
  team("Bósnia", "bosnia"),
  team("Brasil", "brasil"),
  team("Cabo Verde", "cabo-verde"),
  team("Canadá", "canada"),
  team("Catar", "catar"),
  team("Colômbia", "colombia"),
  team("Congo", "congo"),
  team("Coreia do Sul", "corea-do-sul"),
  team("Costa do Marfim", "costa-do-marfim"),
  team("Croácia", "croacia"),
  team("Curaçao", "curacao"),
  team("Egito", "egito"),
  team("Equador", "equador"),
  team("Escócia", "escocia"),
  team("Espanha", "espanha"),
  team("Estados Unidos", "estados-unidos"),
  team("França", "franca"),
  team("Gana", "gana"),
  team("Haiti", "haiti"),
  team("Holanda", "holanda"),
  team("Inglaterra", "inglaterra"),
  team("Irã", "iran"),
  team("Iraque", "iraque"),
  team("Japão", "japao"),
  team("Jordânia", "jordania"),
  team("Marrocos", "marrocos"),
  team("México", "mexico"),
  team("Noruega", "noruega"),
  team("Nova Zelândia", "nova-zelandia"),
  team("Panamá", "panama"),
  team("Paraguai", "paraguai"),
  team("Portugal", "portugal"),
  team("República Tcheca", "republica-tcheca"),
  team("Senegal", "senegal"),
  team("Suécia", "suecia"),
  team("Suíça", "suica"),
  team("Tunísia", "tunisia"),
  team("Turquia", "turquia"),
  team("Uruguai", "uruguai"),
  team("Uzbequistão", "uzbequistao")
] as const satisfies readonly Team[];

export function getTeamByName(name: string) {
  return TEAMS.find((item) => item.name === name) ?? null;
}

export function getTeamBySlug(slug: string) {
  return TEAMS.find((item) => item.slug === slug) ?? null;
}

export function getTeamCrestUrl(name: string) {
  return getTeamByName(name)?.crestUrl ?? null;
}

export function isValidTeamName(name: string) {
  return getTeamByName(name) !== null;
}
