import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const queryPath = searchParams.get('path');

  try {
    // Handle Windows Drive Listing (Root View)
    if (queryPath === '' || queryPath === null) {
      if (os.platform() === 'win32') {
        const drives = [];
        // Check common drive letters
        for (const letter of 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('')) {
          const drivePath = `${letter}:\\`;
          try {
            // Using access to check existence
            // Note: stat might hang on network drives, but access is usually faster
            await fs.access(drivePath);
            drives.push({
              name: drivePath,
              isDirectory: true,
              path: drivePath,
              isDrive: true
            });
          } catch (e) {
            // Drive doesn't exist or no permission
          }
        }
        return NextResponse.json({
          currentPath: '',
          items: drives,
          isRoot: true
        });
      } else {
        // Unix-like: start at /
        return listDirectory('/');
      }
    }

    return listDirectory(queryPath);

  } catch (error: any) {
    console.error('FS List Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

async function listDirectory(dirPath: string) {
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    
    const resultItems = items
      .filter(entry => entry.isDirectory()) // Only showing directories for picker
      .map(entry => ({
        name: entry.name,
        isDirectory: true,
        path: path.join(dirPath, entry.name),
        isDrive: false
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Calculate parent path
    let parentPath = path.dirname(dirPath);
    // On Windows, dirname('C:\') is 'C:\', so we need to detect when to go back to "Root"
    if (os.platform() === 'win32') {
       if (parentPath === dirPath) {
         parentPath = ''; // Signal to go to Drive List
       }
    } else {
       if (dirPath === '/') {
         parentPath = ''; // Already root
       }
    }

    return NextResponse.json({
      currentPath: dirPath,
      items: resultItems,
      parentPath: parentPath,
      isRoot: false
    });
  } catch (err: any) {
    throw err;
  }
}
