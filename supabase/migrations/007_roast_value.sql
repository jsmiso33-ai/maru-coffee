-- 007 · 로스팅 정도를 연속값(0 라이트 ~ 100 다크)으로
-- roast_level(글자)은 목록·검색용으로 그대로 두고, 슬라이더 값은 roast_value에 저장한다.
-- 기존 노트는 글자 단계의 가운데 값으로 채운다. 여러 번 실행해도 안전하다.

alter table public.tasting_notes
  add column if not exists roast_value smallint check (roast_value between 0 and 100);

update public.tasting_notes
set roast_value = case roast_level
  when '라이트' then 10
  when '미디엄 라이트' then 30
  when '미디엄' then 50
  when '미디엄 다크' then 70
  when '다크' then 90
end
where roast_value is null and roast_level is not null;
