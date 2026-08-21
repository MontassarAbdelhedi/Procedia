import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '../..');

describe('updater packaging contracts', () => {
  it('keeps package, manifest, and installer versions aligned', () => {
    const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
    const manifest = fs.readFileSync(path.join(root, 'CSXS/manifest.xml'), 'utf8');
    const installer = fs.readFileSync(path.join(root, 'scripts/installer.iss'), 'utf8');
    expect(manifest).toContain(`ExtensionBundleVersion="${version}"`);
    expect(manifest).toContain(`Id="com.uppercut.procedia" Version="${version}"`);
    expect(installer).toContain(`#define MyAppVersion "${version}"`);
  });

  it('loads updater dependencies before their consumers and index.js', () => {
    const scripts = JSON.parse(fs.readFileSync(path.join(root, 'data/scripts.json'), 'utf8'));
    const core = scripts.indexOf('updater/core.js');
    const adapter = scripts.indexOf('updater/nodeAdapter.js');
    const service = scripts.indexOf('updater/updateService.js');
    expect(core).toBeGreaterThan(-1);
    expect(core).toBeLessThan(adapter);
    expect(adapter).toBeLessThan(service);
    expect(service).toBeLessThan(scripts.indexOf('ui/topBar/dom.js'));
    expect(service).toBeLessThan(scripts.indexOf('index.js'));
  });

  it('enables CEP Node and supports AE 2020+', () => {
    const manifest = fs.readFileSync(path.join(root, 'CSXS/manifest.xml'), 'utf8');
    expect(manifest).toContain('--enable-nodejs');
    expect(manifest).not.toContain('--mixed-context');
    expect(manifest).toContain('Version="[17.0,99.9]"');
    expect(manifest).toContain('<RequiredRuntime Name="CSXS" Version="9.0"/>');
  });

  it('ships the external helper and validates archive paths', () => {
    const helper = fs.readFileSync(path.join(root, 'updater/helper.ps1'), 'utf8');
    expect(helper).toContain('[System.IO.Path]::IsPathRooted');
    expect(helper).toContain("$parts -contains '..'");
    expect(helper).toContain('Assert-Package');
    expect(helper).toContain('Move-Item -LiteralPath $installPlan.backup -Destination $installPlan.target');
  });
});
