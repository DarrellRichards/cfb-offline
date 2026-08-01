/**
 * Position / archetype key ratings for recruit scout views.
 * Priorities follow CFB 27 Labs ability thresholds + community scouting weights.
 */

export type RatedAttribute = { key: string; label: string; short: string; value: number };

/** In-game style abbreviations */
const SHORT: Record<string, string> = {
	OverallRating: 'OVR',
	SpeedRating: 'SPD',
	AccelerationRating: 'ACC',
	AgilityRating: 'AGI',
	ChangeOfDirectionRating: 'COD',
	StrengthRating: 'STR',
	AwarenessRating: 'AWR',
	ImpactBlockingRating: 'IBL',
	StaminaRating: 'STA',
	ToughnessRating: 'TGH',
	InjuryRating: 'INJ',
	ThrowPowerRating: 'THP',
	ThrowAccuracyShortRating: 'SAC',
	ThrowAccuracyMidRating: 'MAC',
	ThrowAccuracyDeepRating: 'DAC',
	ThrowOnTheRunRating: 'RUN',
	ThrowUnderPressureRating: 'TUP',
	BreakSackRating: 'BSK',
	PlayActionRating: 'PAC',
	PassBlockRating: 'PBK',
	PassBlockPowerRating: 'PBP',
	PassBlockFinesseRating: 'PBF',
	RunBlockRating: 'RBK',
	RunBlockPowerRating: 'RBP',
	RunBlockFinesseRating: 'RBF',
	LeadBlockRating: 'LBK',
	KickReturnRating: 'RET',
	JumpingRating: 'JMP',
	CarryingRating: 'CAR',
	JukeMoveRating: 'JKM',
	SpinMoveRating: 'SPM',
	StiffArmRating: 'SFA',
	TruckingRating: 'TRK',
	BreakTackleRating: 'BTK',
	BCVisionRating: 'BCV',
	CatchingRating: 'CTH',
	CatchInTrafficRating: 'CIT',
	SpectacularCatchRating: 'SPC',
	ShortRouteRunningRating: 'SRR',
	MediumRouteRunningRating: 'MRR',
	DeepRouteRunningRating: 'DRR',
	ReleaseRating: 'RLS',
	PlayRecognitionRating: 'PRC',
	PowerMovesRating: 'PMV',
	FinesseMovesRating: 'FMV',
	BlockSheddingRating: 'BSH',
	TackleRating: 'TAK',
	HitPowerRating: 'POW',
	PursuitRating: 'PUR',
	ZoneCoverageRating: 'ZCV',
	ManCoverageRating: 'MCV',
	PressRating: 'PRS',
	KickPowerRating: 'KPW',
	KickAccuracyRating: 'KAC',
	ConfidenceRating: 'CNF',
	LongSnapRating: 'LSN',
};

/** Archetype-first (PlayerType enum) — what you actually scout for that build */
const KEY_BY_PLAYER_TYPE: Record<string, string[]> = {
	// QB
	QB_FieldGeneral: [
		'ThrowPowerRating',
		'ThrowAccuracyShortRating',
		'ThrowAccuracyMidRating',
		'ThrowAccuracyDeepRating',
		'ThrowUnderPressureRating',
		'PlayActionRating',
		'BreakSackRating',
		'SpeedRating',
		'AwarenessRating',
	],
	QB_Improviser: [
		'ThrowOnTheRunRating',
		'ThrowUnderPressureRating',
		'ThrowAccuracyShortRating',
		'ThrowAccuracyMidRating',
		'BreakSackRating',
		'SpeedRating',
		'ChangeOfDirectionRating',
		'AccelerationRating',
		'ThrowPowerRating',
	],
	QB_Scrambler: [
		'SpeedRating',
		'AccelerationRating',
		'ChangeOfDirectionRating',
		'ThrowOnTheRunRating',
		'ThrowPowerRating',
		'BreakSackRating',
		'BreakTackleRating',
		'ThrowAccuracyShortRating',
	],
	QB_PureScrambler: [
		'SpeedRating',
		'AccelerationRating',
		'ChangeOfDirectionRating',
		'JukeMoveRating',
		'BreakTackleRating',
		'CarryingRating',
		'ThrowPowerRating',
		'ThrowOnTheRunRating',
	],

	// HB
	HB_ElusiveBack: [
		'SpeedRating',
		'AccelerationRating',
		'AgilityRating',
		'ChangeOfDirectionRating',
		'JukeMoveRating',
		'SpinMoveRating',
		'BCVisionRating',
		'BreakTackleRating',
		'CarryingRating',
	],
	HB_ElusivePower: [
		'SpeedRating',
		'AccelerationRating',
		'ChangeOfDirectionRating',
		'BreakTackleRating',
		'TruckingRating',
		'JukeMoveRating',
		'StiffArmRating',
		'CarryingRating',
	],
	HB_PowerBack: [
		'SpeedRating',
		'AccelerationRating',
		'TruckingRating',
		'BreakTackleRating',
		'StrengthRating',
		'StiffArmRating',
		'CarryingRating',
		'BCVisionRating',
	],
	HB_PowerBlocking: [
		'ImpactBlockingRating',
		'LeadBlockRating',
		'PassBlockRating',
		'RunBlockRating',
		'StrengthRating',
		'BreakTackleRating',
		'CarryingRating',
		'AccelerationRating',
	],
	HB_PowerReceiving: [
		'CatchingRating',
		'CatchInTrafficRating',
		'AccelerationRating',
		'BreakTackleRating',
		'TruckingRating',
		'CarryingRating',
		'SpeedRating',
		'ShortRouteRunningRating',
	],
	HB_ReceivingBack: [
		'CatchingRating',
		'CatchInTrafficRating',
		'AccelerationRating',
		'ChangeOfDirectionRating',
		'ShortRouteRunningRating',
		'BreakTackleRating',
		'SpeedRating',
		'CarryingRating',
	],

	// WR
	WR_DeepThreat: [
		'SpeedRating',
		'AccelerationRating',
		'DeepRouteRunningRating',
		'JumpingRating',
		'SpectacularCatchRating',
		'ReleaseRating',
		'CatchingRating',
		'ChangeOfDirectionRating',
	],
	WR_Physical: [
		'CatchInTrafficRating',
		'SpectacularCatchRating',
		'StrengthRating',
		'BreakTackleRating',
		'MediumRouteRunningRating',
		'CatchingRating',
		'AccelerationRating',
		'JumpingRating',
	],
	WR_PhysicalBlocker: [
		'RunBlockRating',
		'ImpactBlockingRating',
		'StrengthRating',
		'CatchInTrafficRating',
		'CatchingRating',
		'MediumRouteRunningRating',
		'AccelerationRating',
		'ToughnessRating',
	],
	WR_PhysicalRouteRunner: [
		'MediumRouteRunningRating',
		'ShortRouteRunningRating',
		'CatchInTrafficRating',
		'ReleaseRating',
		'AccelerationRating',
		'CatchingRating',
		'BreakTackleRating',
		'SpectacularCatchRating',
	],
	WR_ShiftyRouteRunner: [
		'ChangeOfDirectionRating',
		'AgilityRating',
		'ShortRouteRunningRating',
		'MediumRouteRunningRating',
		'AccelerationRating',
		'ReleaseRating',
		'JukeMoveRating',
		'CatchingRating',
	],
	WR_Playmaker: [
		'ShortRouteRunningRating',
		'MediumRouteRunningRating',
		'DeepRouteRunningRating',
		'ReleaseRating',
		'CatchingRating',
		'AccelerationRating',
		'ChangeOfDirectionRating',
		'SpectacularCatchRating',
	],
	WR_GadgetReceiver: [
		'SpeedRating',
		'AccelerationRating',
		'ChangeOfDirectionRating',
		'JukeMoveRating',
		'CatchingRating',
		'ThrowPowerRating',
		'ThrowAccuracyShortRating',
		'BreakTackleRating',
	],
	WR_Slot: [
		'ShortRouteRunningRating',
		'MediumRouteRunningRating',
		'ChangeOfDirectionRating',
		'AccelerationRating',
		'CatchingRating',
		'CatchInTrafficRating',
		'ReleaseRating',
		'AgilityRating',
	],

	// TE
	TE_Blocking: [
		'RunBlockRating',
		'PassBlockRating',
		'ImpactBlockingRating',
		'StrengthRating',
		'AwarenessRating',
		'CatchingRating',
		'ToughnessRating',
		'AccelerationRating',
	],
	TE_Possession: [
		'CatchingRating',
		'CatchInTrafficRating',
		'ShortRouteRunningRating',
		'MediumRouteRunningRating',
		'SpectacularCatchRating',
		'RunBlockRating',
		'StrengthRating',
		'AccelerationRating',
	],
	TE_PossessionBlocking: [
		'CatchInTrafficRating',
		'CatchingRating',
		'RunBlockRating',
		'ImpactBlockingRating',
		'StrengthRating',
		'MediumRouteRunningRating',
		'ToughnessRating',
		'BreakTackleRating',
	],
	TE_VerticalThreat: [
		'SpeedRating',
		'AccelerationRating',
		'DeepRouteRunningRating',
		'SpectacularCatchRating',
		'CatchingRating',
		'CatchInTrafficRating',
		'JumpingRating',
		'MediumRouteRunningRating',
	],
	TE_PhysicalRouteRunner: [
		'MediumRouteRunningRating',
		'CatchInTrafficRating',
		'BreakTackleRating',
		'SpectacularCatchRating',
		'AccelerationRating',
		'CatchingRating',
		'StrengthRating',
		'RunBlockRating',
	],

	// OL — CFB 27 archetypes
	OT_Power: [
		'StrengthRating',
		'ImpactBlockingRating',
		'RunBlockRating',
		'RunBlockPowerRating',
		'PassBlockPowerRating',
		'PassBlockRating',
		'ToughnessRating',
		'AwarenessRating',
	],
	OT_PassProtector: [
		'PassBlockRating',
		'PassBlockPowerRating',
		'PassBlockFinesseRating',
		'AwarenessRating',
		'StrengthRating',
		'RunBlockRating',
		'ImpactBlockingRating',
		'ToughnessRating',
	],
	OT_Agile: [
		'AccelerationRating',
		'AgilityRating',
		'RunBlockFinesseRating',
		'PassBlockFinesseRating',
		'RunBlockRating',
		'PassBlockRating',
		'ImpactBlockingRating',
		'AwarenessRating',
	],
	OT_WellRounded: [
		'PassBlockRating',
		'RunBlockRating',
		'StrengthRating',
		'ImpactBlockingRating',
		'PassBlockPowerRating',
		'RunBlockPowerRating',
		'AwarenessRating',
		'ToughnessRating',
	],
	G_Power: [
		'StrengthRating',
		'ImpactBlockingRating',
		'RunBlockRating',
		'RunBlockPowerRating',
		'PassBlockPowerRating',
		'PassBlockRating',
		'ToughnessRating',
		'AwarenessRating',
	],
	G_PassProtector: [
		'PassBlockRating',
		'PassBlockPowerRating',
		'PassBlockFinesseRating',
		'AwarenessRating',
		'StrengthRating',
		'RunBlockRating',
		'ImpactBlockingRating',
		'ToughnessRating',
	],
	G_Agile: [
		'AccelerationRating',
		'AgilityRating',
		'RunBlockFinesseRating',
		'PassBlockFinesseRating',
		'RunBlockRating',
		'PassBlockRating',
		'ImpactBlockingRating',
		'AwarenessRating',
	],
	G_WellRounded: [
		'PassBlockRating',
		'RunBlockRating',
		'StrengthRating',
		'ImpactBlockingRating',
		'PassBlockPowerRating',
		'RunBlockPowerRating',
		'AwarenessRating',
		'ToughnessRating',
	],
	C_Power: [
		'StrengthRating',
		'ImpactBlockingRating',
		'RunBlockRating',
		'RunBlockPowerRating',
		'PassBlockPowerRating',
		'PassBlockRating',
		'ToughnessRating',
		'AwarenessRating',
	],
	C_PassProtector: [
		'PassBlockRating',
		'PassBlockPowerRating',
		'PassBlockFinesseRating',
		'AwarenessRating',
		'StrengthRating',
		'RunBlockRating',
		'ImpactBlockingRating',
		'ToughnessRating',
	],
	C_Agile: [
		'AccelerationRating',
		'AgilityRating',
		'RunBlockFinesseRating',
		'PassBlockFinesseRating',
		'RunBlockRating',
		'PassBlockRating',
		'ImpactBlockingRating',
		'AwarenessRating',
	],
	C_WellRounded: [
		'PassBlockRating',
		'RunBlockRating',
		'StrengthRating',
		'ImpactBlockingRating',
		'PassBlockPowerRating',
		'RunBlockPowerRating',
		'AwarenessRating',
		'ToughnessRating',
	],

	// DL
	DE_PowerRusher: [
		'PowerMovesRating',
		'BlockSheddingRating',
		'StrengthRating',
		'AccelerationRating',
		'TackleRating',
		'PursuitRating',
		'HitPowerRating',
		'ToughnessRating',
	],
	DE_PurePower: [
		'PowerMovesRating',
		'StrengthRating',
		'BlockSheddingRating',
		'HitPowerRating',
		'TackleRating',
		'ImpactBlockingRating',
		'AccelerationRating',
		'ToughnessRating',
	],
	DE_RunStopper: [
		'BlockSheddingRating',
		'StrengthRating',
		'TackleRating',
		'PursuitRating',
		'PlayRecognitionRating',
		'HitPowerRating',
		'AccelerationRating',
		'ToughnessRating',
	],
	DE_SmallerSpeedRusher: [
		'FinesseMovesRating',
		'AccelerationRating',
		'SpeedRating',
		'BlockSheddingRating',
		'TackleRating',
		'PursuitRating',
		'AgilityRating',
		'ChangeOfDirectionRating',
	],
	DT_PowerRusher: [
		'PowerMovesRating',
		'BlockSheddingRating',
		'StrengthRating',
		'AccelerationRating',
		'TackleRating',
		'HitPowerRating',
		'PursuitRating',
		'ToughnessRating',
	],
	DT_PurePower: [
		'PowerMovesRating',
		'StrengthRating',
		'BlockSheddingRating',
		'HitPowerRating',
		'TackleRating',
		'ImpactBlockingRating',
		'ToughnessRating',
		'PlayRecognitionRating',
	],
	DT_NoseTackle: [
		'StrengthRating',
		'BlockSheddingRating',
		'ImpactBlockingRating',
		'TackleRating',
		'PlayRecognitionRating',
		'ToughnessRating',
		'HitPowerRating',
		'AccelerationRating',
	],
	DT_RunStopper: [
		'BlockSheddingRating',
		'StrengthRating',
		'TackleRating',
		'PursuitRating',
		'PlayRecognitionRating',
		'HitPowerRating',
		'ToughnessRating',
		'AccelerationRating',
	],
	DT_SpeedRusher: [
		'FinesseMovesRating',
		'AccelerationRating',
		'BlockSheddingRating',
		'TackleRating',
		'PursuitRating',
		'AgilityRating',
		'StrengthRating',
		'HitPowerRating',
	],

	// LB
	OLB_PassCoverage: [
		'ManCoverageRating',
		'ZoneCoverageRating',
		'SpeedRating',
		'AccelerationRating',
		'PursuitRating',
		'TackleRating',
		'PlayRecognitionRating',
		'ChangeOfDirectionRating',
	],
	OLB_PowerRusher: [
		'PowerMovesRating',
		'FinesseMovesRating',
		'AccelerationRating',
		'BlockSheddingRating',
		'TackleRating',
		'PursuitRating',
		'HitPowerRating',
		'SpeedRating',
	],
	OLB_RunStopper: [
		'BlockSheddingRating',
		'TackleRating',
		'PursuitRating',
		'HitPowerRating',
		'StrengthRating',
		'PlayRecognitionRating',
		'AccelerationRating',
		'ToughnessRating',
	],
	MLB_FieldGeneral: [
		'PlayRecognitionRating',
		'AwarenessRating',
		'TackleRating',
		'PursuitRating',
		'ZoneCoverageRating',
		'BlockSheddingRating',
		'HitPowerRating',
		'AccelerationRating',
	],
	MLB_PassCoverage: [
		'ZoneCoverageRating',
		'ManCoverageRating',
		'AccelerationRating',
		'TackleRating',
		'PursuitRating',
		'PlayRecognitionRating',
		'CatchingRating',
		'SpeedRating',
	],
	MLB_RunStopper: [
		'TackleRating',
		'HitPowerRating',
		'BlockSheddingRating',
		'PursuitRating',
		'StrengthRating',
		'PlayRecognitionRating',
		'ToughnessRating',
		'AccelerationRating',
	],

	// CB / S
	CB_MantoMan: [
		'ManCoverageRating',
		'PressRating',
		'SpeedRating',
		'AccelerationRating',
		'AgilityRating',
		'ChangeOfDirectionRating',
		'JumpingRating',
		'PlayRecognitionRating',
	],
	CB_Slot: [
		'ManCoverageRating',
		'ZoneCoverageRating',
		'ChangeOfDirectionRating',
		'AccelerationRating',
		'AgilityRating',
		'TackleRating',
		'PressRating',
		'PlayRecognitionRating',
	],
	CB_Zone: [
		'ZoneCoverageRating',
		'PlayRecognitionRating',
		'SpeedRating',
		'AccelerationRating',
		'CatchingRating',
		'JumpingRating',
		'TackleRating',
		'ManCoverageRating',
	],
	CB_HybridCorner: [
		'ManCoverageRating',
		'ZoneCoverageRating',
		'SpeedRating',
		'AccelerationRating',
		'TackleRating',
		'PlayRecognitionRating',
		'PressRating',
		'ChangeOfDirectionRating',
	],
	S_Hybrid: [
		'ZoneCoverageRating',
		'ManCoverageRating',
		'SpeedRating',
		'TackleRating',
		'HitPowerRating',
		'PursuitRating',
		'PlayRecognitionRating',
		'AccelerationRating',
	],
	S_RunSupport: [
		'HitPowerRating',
		'TackleRating',
		'PursuitRating',
		'StrengthRating',
		'PlayRecognitionRating',
		'ZoneCoverageRating',
		'AccelerationRating',
		'ToughnessRating',
	],
	S_Zone: [
		'ZoneCoverageRating',
		'PlayRecognitionRating',
		'SpeedRating',
		'CatchingRating',
		'SpectacularCatchRating',
		'AccelerationRating',
		'TackleRating',
		'ManCoverageRating',
	],

	FB_Blocking: [
		'ImpactBlockingRating',
		'LeadBlockRating',
		'RunBlockRating',
		'PassBlockRating',
		'StrengthRating',
		'AwarenessRating',
		'ToughnessRating',
		'CarryingRating',
	],
	FB_Utility: [
		'CatchingRating',
		'LeadBlockRating',
		'ImpactBlockingRating',
		'CarryingRating',
		'BreakTackleRating',
		'AccelerationRating',
		'StrengthRating',
		'ShortRouteRunningRating',
	],

	KP_Accurate: ['KickAccuracyRating', 'KickPowerRating', 'AwarenessRating'],
	KP_Power: ['KickPowerRating', 'KickAccuracyRating', 'AwarenessRating'],
};

/** Position fallback when PlayerType is missing / unknown */
const KEY_BY_POSITION: Record<string, string[]> = {
	QB: [
		'ThrowPowerRating',
		'ThrowAccuracyShortRating',
		'ThrowAccuracyMidRating',
		'ThrowAccuracyDeepRating',
		'ThrowUnderPressureRating',
		'ThrowOnTheRunRating',
		'PlayActionRating',
		'BreakSackRating',
		'SpeedRating',
	],
	HB: [
		'SpeedRating',
		'AccelerationRating',
		'ChangeOfDirectionRating',
		'BreakTackleRating',
		'CarryingRating',
		'BCVisionRating',
		'TruckingRating',
		'JukeMoveRating',
	],
	FB: [
		'ImpactBlockingRating',
		'LeadBlockRating',
		'RunBlockRating',
		'PassBlockRating',
		'StrengthRating',
		'CarryingRating',
		'BreakTackleRating',
		'AwarenessRating',
	],
	WR: [
		'SpeedRating',
		'AccelerationRating',
		'CatchingRating',
		'SpectacularCatchRating',
		'CatchInTrafficRating',
		'ReleaseRating',
		'MediumRouteRunningRating',
		'DeepRouteRunningRating',
	],
	TE: [
		'CatchingRating',
		'CatchInTrafficRating',
		'MediumRouteRunningRating',
		'RunBlockRating',
		'PassBlockRating',
		'AccelerationRating',
		'StrengthRating',
		'SpectacularCatchRating',
	],
	LT: [
		'PassBlockRating',
		'PassBlockPowerRating',
		'PassBlockFinesseRating',
		'RunBlockRating',
		'RunBlockPowerRating',
		'StrengthRating',
		'ImpactBlockingRating',
		'AwarenessRating',
	],
	RT: [
		'PassBlockRating',
		'PassBlockPowerRating',
		'PassBlockFinesseRating',
		'RunBlockRating',
		'RunBlockPowerRating',
		'StrengthRating',
		'ImpactBlockingRating',
		'AwarenessRating',
	],
	LG: [
		'RunBlockRating',
		'RunBlockPowerRating',
		'PassBlockRating',
		'PassBlockPowerRating',
		'StrengthRating',
		'ImpactBlockingRating',
		'AwarenessRating',
		'ToughnessRating',
	],
	RG: [
		'RunBlockRating',
		'RunBlockPowerRating',
		'PassBlockRating',
		'PassBlockPowerRating',
		'StrengthRating',
		'ImpactBlockingRating',
		'AwarenessRating',
		'ToughnessRating',
	],
	C: [
		'PassBlockRating',
		'PassBlockPowerRating',
		'RunBlockRating',
		'RunBlockPowerRating',
		'StrengthRating',
		'ImpactBlockingRating',
		'AwarenessRating',
		'ToughnessRating',
	],
	LE: [
		'PowerMovesRating',
		'FinesseMovesRating',
		'BlockSheddingRating',
		'AccelerationRating',
		'TackleRating',
		'PursuitRating',
		'StrengthRating',
		'HitPowerRating',
	],
	RE: [
		'PowerMovesRating',
		'FinesseMovesRating',
		'BlockSheddingRating',
		'AccelerationRating',
		'TackleRating',
		'PursuitRating',
		'StrengthRating',
		'HitPowerRating',
	],
	DT: [
		'PowerMovesRating',
		'BlockSheddingRating',
		'StrengthRating',
		'TackleRating',
		'PursuitRating',
		'HitPowerRating',
		'PlayRecognitionRating',
		'ToughnessRating',
	],
	LOLB: [
		'AccelerationRating',
		'SpeedRating',
		'PursuitRating',
		'TackleRating',
		'BlockSheddingRating',
		'HitPowerRating',
		'ManCoverageRating',
		'ZoneCoverageRating',
	],
	ROLB: [
		'AccelerationRating',
		'SpeedRating',
		'PursuitRating',
		'TackleRating',
		'BlockSheddingRating',
		'HitPowerRating',
		'ManCoverageRating',
		'ZoneCoverageRating',
	],
	MLB: [
		'TackleRating',
		'PursuitRating',
		'PlayRecognitionRating',
		'BlockSheddingRating',
		'HitPowerRating',
		'ZoneCoverageRating',
		'StrengthRating',
		'AccelerationRating',
	],
	CB: [
		'ManCoverageRating',
		'ZoneCoverageRating',
		'SpeedRating',
		'AccelerationRating',
		'PressRating',
		'AgilityRating',
		'ChangeOfDirectionRating',
		'PlayRecognitionRating',
	],
	FS: [
		'ZoneCoverageRating',
		'ManCoverageRating',
		'SpeedRating',
		'AccelerationRating',
		'PursuitRating',
		'TackleRating',
		'PlayRecognitionRating',
		'CatchingRating',
	],
	SS: [
		'HitPowerRating',
		'TackleRating',
		'PursuitRating',
		'ZoneCoverageRating',
		'ManCoverageRating',
		'SpeedRating',
		'PlayRecognitionRating',
		'StrengthRating',
	],
	K: ['KickPowerRating', 'KickAccuracyRating', 'AwarenessRating'],
	P: ['KickPowerRating', 'KickAccuracyRating', 'AwarenessRating'],
};

KEY_BY_POSITION.OT = KEY_BY_POSITION.LT;
KEY_BY_POSITION.OG = KEY_BY_POSITION.LG;
KEY_BY_POSITION.G = KEY_BY_POSITION.LG;
KEY_BY_POSITION.OL = KEY_BY_POSITION.LT;
KEY_BY_POSITION.DE = KEY_BY_POSITION.LE;
KEY_BY_POSITION.EDGE = KEY_BY_POSITION.LE;
KEY_BY_POSITION.OLB = KEY_BY_POSITION.LOLB;
KEY_BY_POSITION.LB = KEY_BY_POSITION.MLB;
KEY_BY_POSITION.S = KEY_BY_POSITION.FS;
KEY_BY_POSITION.SAF = KEY_BY_POSITION.FS;
KEY_BY_POSITION.DB = KEY_BY_POSITION.CB;
KEY_BY_POSITION.KP = KEY_BY_POSITION.K;

const FALLBACK_KEYS = [
	'SpeedRating',
	'AccelerationRating',
	'AgilityRating',
	'StrengthRating',
	'AwarenessRating',
	'StaminaRating',
	'ToughnessRating',
	'InjuryRating',
];

function ratingLabel(key: string) {
	return key
		.replace(/Rating$/i, '')
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/^BC /i, 'BC ')
		.trim();
}

function ratingShort(key: string) {
	return SHORT[key] || ratingLabel(key).slice(0, 3).toUpperCase();
}

function normalizePos(position: string) {
	return String(position || '')
		.trim()
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, '');
}

function normalizePlayerType(playerType: string) {
	return String(playerType || '')
		.trim()
		.replace(/[^A-Za-z0-9_]/g, '');
}

export function getKeyAttributeKeys(position: string, playerType?: string): string[] {
	const typeKey = normalizePlayerType(playerType || '');
	if (typeKey && KEY_BY_PLAYER_TYPE[typeKey]) return KEY_BY_PLAYER_TYPE[typeKey];
	const pos = normalizePos(position);
	return KEY_BY_POSITION[pos] || FALLBACK_KEYS;
}

/** Key attribute defs for a position (no player ratings needed) — for filter UIs. */
export function listKeyAttributeMeta(position: string, playerType?: string) {
	return getKeyAttributeKeys(position, playerType).map((key) => ({
		key,
		label: ratingLabel(key),
		short: ratingShort(key),
	}));
}

export function buildKeyAttributes(
	ratings: Record<string, number> | null | undefined,
	position: string,
	playerType?: string
): RatedAttribute[] {
	if (!ratings) return [];
	const keys = getKeyAttributeKeys(position, playerType);
	const out: RatedAttribute[] = [];
	for (const key of keys) {
		if (!Object.prototype.hasOwnProperty.call(ratings, key)) continue;
		const value = Number(ratings[key]);
		if (!Number.isFinite(value)) continue;
		out.push({
			key,
			label: ratingLabel(key),
			short: ratingShort(key),
			value,
		});
	}
	return out;
}

export function buildAllAttributes(
	ratings: Record<string, number> | null | undefined,
	options: { excludeKeys?: Set<string>; includeOverall?: boolean } = {}
): RatedAttribute[] {
	if (!ratings) return [];
	const exclude = options.excludeKeys || new Set<string>();
	const out: RatedAttribute[] = [];
	for (const [key, raw] of Object.entries(ratings)) {
		if (!options.includeOverall && /^OverallRating$/i.test(key)) continue;
		if (exclude.has(key)) continue;
		const value = Number(raw);
		if (!Number.isFinite(value)) continue;
		out.push({
			key,
			label: ratingLabel(key),
			short: ratingShort(key),
			value,
		});
	}
	out.sort((a, b) => a.label.localeCompare(b.label));
	return out;
}
