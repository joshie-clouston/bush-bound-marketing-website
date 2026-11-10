"""Bush Bound: apply kit builder parameters to a Fusion design.

Every kit builder order email comes with a CSV attachment (Name, Unit, Expression, Comment).
Open the parametric kit template in Fusion, run this script (Utilities > Scripts and Add-Ins),
pick the CSV, and the template's user parameters update to that customer's layout.
Parameters that don't exist in the template yet are created, so you can see what's missing.
"""

import csv
import traceback

import adsk.core
import adsk.fusion


def run(context):
    app = adsk.core.Application.get()
    ui = app.userInterface
    try:
        design = adsk.fusion.Design.cast(app.activeProduct)
        if not design:
            ui.messageBox('Open the Bush Bound kit template (a Design) first.')
            return

        dialog = ui.createFileDialog()
        dialog.title = 'Select the kit parameters CSV'
        dialog.filter = 'CSV files (*.csv)'
        if dialog.showOpen() != adsk.core.DialogResults.DialogOK:
            return

        params = design.userParameters
        updated, created, failed = [], [], []
        with open(dialog.filename, newline='', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                name = (row.get('Name') or '').strip()
                expression = (row.get('Expression') or '').strip()
                if not name or not expression:
                    continue
                try:
                    existing = params.itemByName(name)
                    if existing:
                        existing.expression = expression
                        updated.append(name)
                    else:
                        params.add(name, adsk.core.ValueInput.createByString(expression), (row.get('Unit') or '').strip(), row.get('Comment') or '')
                        created.append(name)
                except Exception:
                    failed.append(name)

        lines = [f'Updated {len(updated)} parameter(s).']
        if created:
            lines.append(f'Created {len(created)} new: {", ".join(created)}')
        if failed:
            lines.append(f'Could not apply: {", ".join(failed)}')
        ui.messageBox('\n'.join(lines), 'Bush Bound kit parameters')
    except Exception:
        ui.messageBox('Failed:\n{}'.format(traceback.format_exc()))
