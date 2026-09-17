---
title: How to Roll Back a Rabbit R1 to Stock OS
slug: rabbit-r1-rollback-to-stock-os
date: 2025-10-19
summary: A rollback guide for Rabbit R1 devices that were flashed with custom Android software or became bricked.
tags:
  - rabbit-r1
  - android
  - recovery
draft: false
---

## Introduction

This guide provides a possible solution for people who used the [Rabbit R1 Escape repository](https://github.com/RabbitHoleEscapeR1/r1_escape) and either bricked their device or want to roll back from a custom Android installation.

A system backup is required. You can use your own backup or download one from the reference link below. This guide is based on the solution discussed in [this GitHub issue](https://github.com/RabbitHoleEscapeR1/r1_escape/issues/32).

> Important: This guide assumes that you have the `frp.bin` file from a previous installation. If you do not have this file, do not comment out line 46 in the `r1.ps1` script.

## Steps

### 1. Prepare the `r1.ps1` script

Open PowerShell in the `r1_escape` folder, where `r1.ps1` is located. Modify the script by commenting out line 46 and ensuring line 47 is active:

```powershell
# Lines 46-47
# python mtk r frp frp.bin --serialport
python mtk wl "r1 backup" --serialport
```

### 2. Fix slow rollback speeds

If the rollback is extremely slow, around 0.09 MB/s, edit `mtkclient\mtkclient\Library\DA\xflash\xflash_lib.py`.

On line 162, change the `dsize` value from `0x200` to `0x80100`:

```python
# Before: capped
dsize = min(length, 0x200)

# After: fixed
dsize = min(length, 0x80100)
```

### 3. Modify `frp.bin` handling

In `r1.ps1`, adjust the `frp.bin` logic as follows:

```powershell
# Lines 52-55
if ($frpBinBytes[-1] -eq 0x01) { # Changed from 0x00
   $frpBinBytes[-1] = 0x00      # Changed from 0x01
   [System.IO.File]::WriteAllBytes($frpBinPath, $frpBinBytes)
}
```

### 4. Comment out the `fastboot` commands

Comment out the `fastboot` commands at the end of `r1.ps1` so you can run them manually later:

```powershell
# Lines 74-79
# fastboot flashing unlock
# fastboot -w
# fastboot flash --disable-verity --disable-verification vbmeta vbmeta.img
# fastboot reboot-fastboot
# fastboot flash system system.img
# fastboot reboot
```

### 5. Run the rollback script

Execute the modified `r1.ps1` script. It will install the R1 backup images onto the device. You may need to disconnect and reconnect the Rabbit R1 over USB multiple times during the process, as with the standard script.

Once `r1.ps1` exits successfully, run these commands in the same PowerShell window:

```powershell
fastboot flashing lock
fastboot -w
fastboot reboot
```

Once complete, the device should be back on Stock OS.

## References

- [Rollback discussion](https://github.com/RabbitHoleEscapeR1/r1_escape/issues/32)
- [R1 backup download](https://drive.proton.me/urls/RWFQD4W9Z0#0xrCC1B5fq1u)
- [Slow speeds on mtkclient](https://github.com/bkerler/mtkclient/issues/271#issuecomment-2272411904)
