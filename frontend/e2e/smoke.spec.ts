import { expect, test } from '@playwright/test';

// Parcours de bout en bout (sans compte) : à lancer contre un environnement de TEST.
test('la racine mène à la connexion, avec CSP et logo', async ({ page }) => {
  const res = await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
  expect(res?.headers()['content-security-policy']).toContain("'nonce-");
  await expect(page.getByAltText('FOM').first()).toBeVisible();
  await expect(page.getByText('Faire vos demandes en outre-mer')).toBeVisible();
});

test('les pages privées redirigent vers la connexion', async ({ page }) => {
  await page.goto('/espace');
  await expect(page).toHaveURL(/\/login\?next=%2Fespace/);
  await page.goto('/apply');
  await expect(page).toHaveURL(/\/login/);
});

test('connexion : champs numéro et clé, clé refusée si elle n’a pas 3 chiffres', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Numéro mobile').fill('87123456');
  await page.getByLabel('Clé d’identification').fill('12');
  await page.getByRole('button', { name: 'Ouvrir une session' }).click();
  await expect(page.getByText('La clé comporte 3 chiffres.')).toBeVisible();
});

test('connexion : redirection ouverte refusée', async ({ page }) => {
  await page.goto('/login?next=https://example.com');
  await expect(page.getByRole('button', { name: 'Ouvrir une session' })).toBeVisible();
  await expect(page.locator('input[name="next"]')).toHaveValue('');
});

test('le sélecteur propose les 5 langues', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Langue' }).click();
  for (const name of ['Français', 'English', 'Español', 'Deutsch', 'Português']) await expect(page.getByRole('option', { name })).toBeVisible();
});
