import { ScrollArea } from "@/components/ui/scroll-area";
import { IBoxShadow, IImage, ITrackItem } from "@designcombo/types";
import Outline from "./common/outline";
import Shadow from "./common/shadow";
import Opacity from "./common/opacity";
import Rounded from "./common/radius";
import AspectRatio from "./common/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Crop, Loader2, Wand2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
import Blur from "./common/blur";
import Brightness from "./common/brightness";
import Contrast from "./common/contrast";
import Saturation from "./common/saturation";
import Hue from "./common/hue";
import Sepia from "./common/sepia";
import Grayscale from "./common/grayscale";
import useLayoutStore from "../store/use-layout-store";
import { Label } from "@/components/ui/label";
import { Animations } from "./common/animations";
import { toast } from "sonner";
import { uploadFile } from "@/lib/upload-service";

const BasicImage = ({
	trackItem,
	type,
}: {
	trackItem: ITrackItem & IImage;
	type?: string;
}) => {
	const showAll = !type;
	const [properties, setProperties] = useState(trackItem);
	const [isRemovingBg, setIsRemovingBg] = useState(false);
	const { setCropTarget } = useLayoutStore();
	useEffect(() => {
		setProperties(trackItem);
	}, [trackItem]);

	const handleRemoveBackground = async () => {
		const imageUrl = properties.details.src;
		if (!imageUrl) {
			toast.error("No image source found");
			return;
		}

		setIsRemovingBg(true);
		try {
			// Free client-side removal via @imgly/background-removal (no API cost)
			const { removeBackground } = await import("@imgly/background-removal");
			const absoluteUrl =
				imageUrl.startsWith("/") && typeof window !== "undefined"
					? `${window.location.origin}${imageUrl}`
					: imageUrl;
			const blob = await removeBackground(absoluteUrl);
			const file = new File([blob], "bg-removed.png", { type: "image/png" });
			const result = await uploadFile(file);
			if (result?.url) {
				dispatch(EDIT_OBJECT, {
					payload: {
						[trackItem.id]: {
							details: {
								src: result.url,
							},
						},
					},
				});
				setProperties((prev) => ({
					...prev,
					details: {
						...prev.details,
						src: result.url,
					},
				}));
				toast.success("Background removed successfully!");
			}
		} catch (error) {
			console.error("Error removing background:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to remove background",
			);
		} finally {
			setIsRemovingBg(false);
		}
	};

	const onChangeBorderWidth = (v: number) => {
		dispatch(EDIT_OBJECT, {
			payload: {
				[trackItem.id]: {
					details: {
						borderWidth: v,
					},
				},
			},
		});
		setProperties((prev) => {
			return {
				...prev,
				details: {
					...prev.details,
					borderWidth: v,
				},
			};
		});
	};

	const onChangeBorderColor = (v: string) => {
		dispatch(EDIT_OBJECT, {
			payload: {
				[trackItem.id]: {
					details: {
						borderColor: v,
					},
				},
			},
		});
		setProperties((prev) => {
			return {
				...prev,
				details: {
					...prev.details,
					borderColor: v,
				},
			};
		});
	};

	const handleChangeOpacity = (v: number) => {
		dispatch(EDIT_OBJECT, {
			payload: {
				[trackItem.id]: {
					details: {
						opacity: v,
					},
				},
			},
		});
		setProperties((prev) => {
			return {
				...prev,
				details: {
					...prev.details,
					opacity: v,
				},
			};
		});
	};

	const onChangeBlur = (v: number) => {
		dispatch(EDIT_OBJECT, {
			payload: {
				[trackItem.id]: {
					details: {
						blur: v,
					},
				},
			},
		});
		setProperties((prev) => {
			return {
				...prev,
				details: {
					...prev.details,
					blur: v,
				},
			};
		});
	};
	const onChangeBrightness = (v: number) => {
		dispatch(EDIT_OBJECT, {
			payload: {
				[trackItem.id]: {
					details: {
						brightness: v,
					},
				},
			},
		});
		setProperties((prev) => {
			return {
				...prev,
				details: {
					...prev.details,
					brightness: v,
				},
			};
		});
	};

	const onChangeContrast = (v: number) => {
		dispatch(EDIT_OBJECT, {
			payload: { [trackItem.id]: { details: { contrast: v } } },
		});
		setProperties((prev) => ({
			...prev,
			details: { ...prev.details, contrast: v },
		}));
	};

	const onChangeSaturation = (v: number) => {
		dispatch(EDIT_OBJECT, {
			payload: { [trackItem.id]: { details: { saturation: v } } },
		});
		setProperties((prev) => ({
			...prev,
			details: { ...prev.details, saturation: v },
		}));
	};

	const onChangeHue = (v: number) => {
		dispatch(EDIT_OBJECT, {
			payload: { [trackItem.id]: { details: { hue: v } } },
		});
		setProperties((prev) => ({
			...prev,
			details: { ...prev.details, hue: v },
		}));
	};

	const onChangeSepia = (v: number) => {
		dispatch(EDIT_OBJECT, {
			payload: { [trackItem.id]: { details: { sepia: v } } },
		});
		setProperties((prev) => ({
			...prev,
			details: { ...prev.details, sepia: v },
		}));
	};

	const onChangeGrayscale = (v: number) => {
		dispatch(EDIT_OBJECT, {
			payload: { [trackItem.id]: { details: { grayscale: v } } },
		});
		setProperties((prev) => ({
			...prev,
			details: { ...prev.details, grayscale: v },
		}));
	};

	const onChangeBorderRadius = (v: number) => {
		dispatch(EDIT_OBJECT, {
			payload: {
				[trackItem.id]: {
					details: {
						borderRadius: v,
					},
				},
			},
		});
		setProperties((prev) => {
			return {
				...prev,
				details: {
					...prev.details,
					borderRadius: v,
				},
			};
		});
	};

	const handleChangeLockRatio = (locked: boolean) => {
		dispatch(EDIT_OBJECT, {
			payload: {
				[trackItem.id]: {
					details: {
						lockAspectRatio: locked,
					},
				},
			},
		});
		setProperties((prev) => ({
			...prev,
			details: {
				...prev.details,
				lockAspectRatio: locked,
			},
		}));
	};

	const onChangeBoxShadow = (boxShadow: IBoxShadow) => {
		dispatch(EDIT_OBJECT, {
			payload: {
				[trackItem.id]: {
					details: {
						boxShadow: boxShadow,
					},
				},
			},
		});

		setProperties((prev) => {
			return {
				...prev,
				details: {
					...prev.details,
					boxShadow,
				},
			};
		});
	};

	const components = [
		{
			key: "crop",
			component: (
				<div className="mb-4 flex gap-2">
					<Button
						variant={"secondary"}
						size={"icon"}
						onClick={() => {
							setCropTarget(trackItem);
						}}
						title="Crop image"
					>
						<Crop size={18} />
					</Button>
					<Button
						variant={"secondary"}
						size={"icon"}
						onClick={handleRemoveBackground}
						disabled={isRemovingBg}
						title="Remove background"
					>
						{isRemovingBg ? (
							<Loader2 size={18} className="animate-spin" />
						) : (
							<Wand2 size={18} />
						)}
					</Button>
				</div>
			),
		},
		{
			key: "basic",
			component: (
				<div className="flex flex-col gap-2">
					<Label className="font-sans text-xs font-semibold">Basic</Label>

					<AspectRatio
						value={(properties.details as any).lockAspectRatio ?? true}
						onChange={handleChangeLockRatio}
					/>
					<Rounded
						onChange={(v: number) => onChangeBorderRadius(v)}
						value={properties.details.borderRadius as number}
					/>
					<Opacity
						onChange={(v: number) => handleChangeOpacity(v)}
						value={properties.details.opacity ?? 100}
					/>
				</div>
			),
		},
		{
			key: "adjust",
			component: (
				<div className="flex flex-col gap-2">
					<Label className="font-sans text-xs font-semibold">Adjust</Label>
					<Brightness
						onChange={(v: number) => onChangeBrightness(v)}
						value={(properties.details as any).brightness ?? 100}
					/>
					<Contrast
						onChange={onChangeContrast}
						value={(properties.details as any).contrast ?? 100}
					/>
					<Saturation
						onChange={onChangeSaturation}
						value={(properties.details as any).saturation ?? 100}
					/>
					<Hue
						onChange={onChangeHue}
						value={(properties.details as any).hue ?? 0}
					/>
					<Sepia
						onChange={onChangeSepia}
						value={(properties.details as any).sepia ?? 0}
					/>
					<Grayscale
						onChange={onChangeGrayscale}
						value={(properties.details as any).grayscale ?? 0}
					/>
					<Blur
						onChange={(v: number) => onChangeBlur(v)}
						value={(properties.details as any).blur ?? 0}
					/>
				</div>
			),
		},
		{
			key: "animations",
			component: <Animations trackItem={trackItem} properties={properties} />,
		},

		{
			key: "outline",
			component: (
				<Outline
					label="Outline"
					onChageBorderWidth={(v: number) => onChangeBorderWidth(v)}
					onChangeBorderColor={(v: string) => onChangeBorderColor(v)}
					valueBorderWidth={properties.details.borderWidth as number}
					valueBorderColor={properties.details.borderColor as string}
				/>
			),
		},
		{
			key: "shadow",
			component: (
				<Shadow
					label="Shadow"
					onChange={(v: IBoxShadow) => onChangeBoxShadow(v)}
					value={
						properties.details.boxShadow ?? {
							color: "transparent",
							x: 0,
							y: 0,
							blur: 0,
						}
					}
				/>
			),
		},
	];
	return (
		<div className="flex flex-1 flex-col min-h-0">
			<div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
				Image
			</div>
			<div className="flex-1 min-h-0 overflow-hidden">
				<ScrollArea className="h-full">
					<div className="flex flex-col gap-2 px-4 py-4">
						{components
							.filter((comp) => showAll || comp.key === type)
							.map((comp) => (
								<React.Fragment key={comp.key}>{comp.component}</React.Fragment>
							))}
					</div>
				</ScrollArea>
			</div>
		</div>
	);
};

export default BasicImage;
