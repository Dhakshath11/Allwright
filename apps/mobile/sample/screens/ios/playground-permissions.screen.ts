import { test, expect } from '@mobilewright/test';
import type { Screen, Locator } from '@mobilewright/core';
import { MobileUtils } from '../../../utils/mobile.utils';

export class PlaygroundPermissionsScreen {
  private readonly utils: MobileUtils;
  private readonly backButton: Locator;
  private readonly screenTitle: Locator;
  private readonly cameraPermissionStatus: Locator;
  private readonly requestCameraPermissionButton: Locator;
  private readonly breadcrumb: Locator;

  constructor(screen: Screen) {
    this.utils = new MobileUtils(screen);
    this.backButton = this.utils.getByTestId('BackButton');
    this.screenTitle = this.utils.getByTestId('Permissions');
    this.cameraPermissionStatus = this.utils.getByTestId('camera_permission_status');
    this.requestCameraPermissionButton = this.utils.getByTestId('request_camera_permission_button');
    this.breadcrumb = this.utils.getByTestId('breadcrumb');
  }

  async expectAtScreen(): Promise<void> {
    await test.step('Expect Permissions screen is visible', async () => {
      await expect(this.screenTitle).toBeVisible();
    });
  }

  async expectStatusNotDetermined(): Promise<void> {
    await test.step('Expect camera permission status is "Not Determined"', async () => {
      await expect(this.cameraPermissionStatus).toHaveText('Not Determined');
    });
  }

  async expectStatusGranted(): Promise<void> {
    await test.step('Expect camera permission status is "Granted"', async () => {
      await expect(this.cameraPermissionStatus).toHaveText('Granted');
    });
  }

  async tapRequestCameraPermission(): Promise<void> {
    await test.step('Tap Request Camera Permission button', async () => {
      await this.utils.tap(this.requestCameraPermissionButton);
    });
  }

  async tapBack(): Promise<void> {
    await test.step('Tap Back button', async () => {
      await this.utils.tap(this.backButton);
    });
  }

  async expectBreadcrumbVisible(): Promise<void> {
    await test.step('Expect breadcrumb is visible', async () => {
      await expect(this.breadcrumb).toBeVisible();
    });
  }
}
