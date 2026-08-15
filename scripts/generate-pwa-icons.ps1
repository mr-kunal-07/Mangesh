Add-Type -AssemblyName System.Drawing

function New-PwaIcon {
  param([int]$Size, [string]$OutputPath)

  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  try {
    $bounds = [System.Drawing.Rectangle]::new(0, 0, $Size, $Size)
    $background = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
      $bounds,
      [System.Drawing.ColorTranslator]::FromHtml('#8f3d17'),
      [System.Drawing.ColorTranslator]::FromHtml('#4a1b0c'),
      45
    )
    $graphics.FillRectangle($background, $bounds)
    $background.Dispose()

    $ringPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(105, 255, 216, 157), [float]($Size * 0.014))
    $inset = [float]($Size * 0.18)
    $graphics.DrawEllipse($ringPen, $inset, $inset, $Size - (2 * $inset), $Size - (2 * $inset))
    $ringPen.Dispose()

    $font = [System.Drawing.Font]::new('Nirmala UI', [float]($Size * 0.39), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $brush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#ffd89d'))
    $format = [System.Drawing.StringFormat]::new()
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $textBounds = [System.Drawing.RectangleF]::new(0, [float]($Size * 0.035), $Size, $Size)
    $graphics.DrawString('ॐ', $font, $brush, $textBounds, $format)
    $format.Dispose()
    $brush.Dispose()
    $font.Dispose()

    $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  }
  finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

$publicDirectory = Join-Path $PSScriptRoot '..\public'
New-PwaIcon -Size 192 -OutputPath (Join-Path $publicDirectory 'pwa-icon-192.png')
New-PwaIcon -Size 512 -OutputPath (Join-Path $publicDirectory 'pwa-icon-512.png')
