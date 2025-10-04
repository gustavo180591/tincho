<script lang="ts">
  export let amount: number;
  export let currency: string = 'ARS';
  export let strike: boolean = false;
  $: formatted = new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
</script>

<span class={strike ? 'line-through opacity-60' : ''}>{formatted}</span>