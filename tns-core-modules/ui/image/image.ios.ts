import {
    ImageSource, ImageBase, stretchProperty, imageSourceProperty, tintColorProperty, srcProperty, layout, Color,
    traceEnabled, traceWrite, traceCategories
} from "./image-common";

export * from "./image-common";

export class Image extends ImageBase {
    private _ios: UIImageView;
    private _imageSourceAffectsLayout: boolean = true;
    private _templateImageWasCreated: boolean;

    constructor() {
        super();

        //TODO: Think of unified way of setting all the default values.
        this.nativeView = this._ios = UIImageView.new();
        this._ios.contentMode = UIViewContentMode.ScaleAspectFit;
        this._ios.userInteractionEnabled = true;
        this._setNativeClipToBounds();
    }

    get ios(): UIImageView {
        return this._ios;
    }

    private setTintColor(value: Color) {
        if (value && this._ios.image && !this._templateImageWasCreated) {
            this._ios.image = this._ios.image.imageWithRenderingMode(UIImageRenderingMode.AlwaysTemplate);
            this._templateImageWasCreated = true;
        } else if (this._ios.image && this._templateImageWasCreated) {
            this._templateImageWasCreated = false;
            this._ios.image = this._ios.image.imageWithRenderingMode(UIImageRenderingMode.Automatic);
        }
        this._ios.tintColor = value ? value.ios : null;
    }

    public _setNativeImage(nativeImage: UIImage) {
        this.ios.image = nativeImage;
        this._templateImageWasCreated = false;
        this.setTintColor(this.style.tintColor);

        if (this._imageSourceAffectsLayout) {
            this.requestLayout();
        }
    }

    _setNativeClipToBounds() {
        // Always set clipsToBounds for images
        this._ios.clipsToBounds = true;
    }

    public onMeasure(widthMeasureSpec: number, heightMeasureSpec: number): void {
        // We don't call super because we measure native view with specific size.     
        let width = layout.getMeasureSpecSize(widthMeasureSpec);
        let widthMode = layout.getMeasureSpecMode(widthMeasureSpec);

        let height = layout.getMeasureSpecSize(heightMeasureSpec);
        let heightMode = layout.getMeasureSpecMode(heightMeasureSpec);

        let nativeWidth = this.imageSource ? layout.toDevicePixels(this.imageSource.width) : 0;
        let nativeHeight = this.imageSource ? layout.toDevicePixels(this.imageSource.height) : 0;

        let measureWidth = Math.max(nativeWidth, this.effectiveMinWidth);
        let measureHeight = Math.max(nativeHeight, this.effectiveMinHeight);

        let finiteWidth: boolean = widthMode !== layout.UNSPECIFIED;
        let finiteHeight: boolean = heightMode !== layout.UNSPECIFIED;

        this._imageSourceAffectsLayout = widthMode !== layout.EXACTLY || heightMode !== layout.EXACTLY;

        if (nativeWidth !== 0 && nativeHeight !== 0 && (finiteWidth || finiteHeight)) {
            let scale = Image.computeScaleFactor(width, height, finiteWidth, finiteHeight, nativeWidth, nativeHeight, this.stretch);
            let resultW = Math.round(nativeWidth * scale.width);
            let resultH = Math.round(nativeHeight * scale.height);

            measureWidth = finiteWidth ? Math.min(resultW, width) : resultW;
            measureHeight = finiteHeight ? Math.min(resultH, height) : resultH;

            if (traceEnabled()) {
                traceWrite("Image stretch: " + this.stretch +
                    ", nativeWidth: " + nativeWidth +
                    ", nativeHeight: " + nativeHeight, traceCategories.Layout);
            }
        }

        let widthAndState = Image.resolveSizeAndState(measureWidth, width, widthMode, 0);
        let heightAndState = Image.resolveSizeAndState(measureHeight, height, heightMode, 0);

        this.setMeasuredDimension(widthAndState, heightAndState);
    }

    private static computeScaleFactor(measureWidth: number, measureHeight: number, widthIsFinite: boolean, heightIsFinite: boolean, nativeWidth: number, nativeHeight: number, imageStretch: string): { width: number; height: number } {
        let scaleW = 1;
        let scaleH = 1;

        if ((imageStretch === "aspectFill" || imageStretch === "aspectFit" || imageStretch === "fill") &&
            (widthIsFinite || heightIsFinite)) {

            scaleW = (nativeWidth > 0) ? measureWidth / nativeWidth : 0;
            scaleH = (nativeHeight > 0) ? measureHeight / nativeHeight : 0;

            if (!widthIsFinite) {
                scaleW = scaleH;
            }
            else if (!heightIsFinite) {
                scaleH = scaleW;
            }
            else {
                // No infinite dimensions.
                switch (imageStretch) {
                    case "aspectFit":
                        scaleH = scaleW < scaleH ? scaleW : scaleH;
                        scaleW = scaleH;
                        break;
                    case "aspectFill":
                        scaleH = scaleW > scaleH ? scaleW : scaleH;
                        scaleW = scaleH;
                        break;
                }
            }
        }
        return { width: scaleW, height: scaleH };
    }

    [stretchProperty.getDefault](): "aspectFit" {
        return "aspectFit";
    }
    [stretchProperty.setNative](value: "none" | "aspectFill" | "aspectFit" | "fill") {
        switch (value) {
            case "aspectFit":
                this._ios.contentMode = UIViewContentMode.ScaleAspectFit;
                break;
            case "aspectFill":
                this._ios.contentMode = UIViewContentMode.ScaleAspectFill;
                break;
            case "fill":
                this._ios.contentMode = UIViewContentMode.ScaleToFill;
                break;
            case "none":
            default:
                this._ios.contentMode = UIViewContentMode.TopLeft;
                break;
        }
    }

    [tintColorProperty.getDefault](): Color {
        return undefined;
    }
    [tintColorProperty.setNative](value: Color) {
        this.setTintColor(value);
    }

    [imageSourceProperty.getDefault](): ImageSource {
        return undefined;
    }
    [imageSourceProperty.setNative](value: ImageSource) {
        this._setNativeImage(value ? value.ios : null);
    }

    [srcProperty.getDefault](): any {
        return undefined;
    }
    [srcProperty.setNative](value: any) {
        this._createImageSourceFromSrc();
    }
}