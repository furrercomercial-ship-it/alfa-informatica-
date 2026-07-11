insert into public.hero_slides (imagem_url, ordem, ativo)
select 'teste hero.png', 0, true
where not exists (select 1 from public.hero_slides);
